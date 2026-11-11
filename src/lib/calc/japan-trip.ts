/**
 * Japan trip cost: pure calculation logic.
 *
 * Official amounts (departure tax, JR Pass, city lodging taxes, visa fees) come from
 * src/data/travel/japan.ts with their source and the date we read them. Everything
 * else (flights, rooms, daily spending) is our estimate, labelled as such, for the
 * visitor to replace. All yen amounts convert at the dated ECB reference rate.
 */
import {
  DEPARTURE_TAX_JPY, JR_PASS, KYOTO_TAX_BANDS, TOKYO_TAX_BANDS, ORIGINS, STYLES,
  type Origin, type Style, type PassDays,
} from '../../data/travel/japan';

export interface JapanTripInput {
  origin: Origin;
  adults: number;
  /** Children aged 6 to 11 (JR Pass child fare; departure tax applies from age 2). */
  children: number;
  tokyoNights: number;
  kyotoNights: number;
  /** Nights elsewhere (Osaka, Hiroshima…): no city tax is added for these. */
  otherNights: number;
  style: Style;
  /** 0 = no pass. Bought on the official JR Pass website. */
  jrPass: PassDays;
  /** Return economy flight per person, in the origin's currency. */
  flightPerPerson: number;
  /** Optional overrides in yen. */
  roomPerNightJpy?: number;
  dailyPerAdultJpy?: number;
}

export interface TripLine { id: string; label: string; jpy: number; home: number; kind: 'official' | 'estimate' }

export interface JapanTripResult {
  nights: number;
  people: number;
  rooms: number;
  lines: TripLine[];
  totalJpy: number;
  totalHome: number;
  perPersonHome: number;
  /** Home-currency units per 1 JPY, from the ECB cross rate. */
  homePerJpy: number;
}

const clampInt = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.floor(Number.isFinite(n) ? n : min)));

/** Tax per person per night for a room rate per person, from (upper bound exclusive, tax) bands. */
export function bandTax(perPersonRate: number, bands: readonly { below: number; tax: number }[]): number {
  for (const b of bands) if (perPersonRate < b.below) return b.tax;
  return bands[bands.length - 1].tax;
}

export function computeJapanTrip(i: JapanTripInput, perEur: Record<string, number>): JapanTripResult {
  const o = ORIGINS[i.origin];
  const s = STYLES[i.style];
  const adults = clampInt(i.adults, 1, 10);
  const children = clampInt(i.children, 0, 10);
  const people = adults + children;
  const tokyo = clampInt(i.tokyoNights, 0, 90);
  const kyoto = clampInt(i.kyotoNights, 0, 90);
  const other = clampInt(i.otherNights, 0, 90);
  const nights = tokyo + kyoto + other;
  const days = nights + 1;
  // Two adults share a room; children share with adults.
  const rooms = Math.ceil(adults / 2);
  const room = i.roomPerNightJpy && i.roomPerNightJpy > 0 ? i.roomPerNightJpy : s.roomJpy;
  const daily = i.dailyPerAdultJpy && i.dailyPerAdultJpy > 0 ? i.dailyPerAdultJpy : s.dailyJpy;
  // Lodging taxes are charged per person per night on the per-person rate.
  const perPersonRate = (room * rooms) / people;

  const homePerJpy = perEur[o.currency] / perEur.JPY;
  const line = (id: string, label: string, jpy: number, kind: TripLine['kind']): TripLine =>
    ({ id, label, jpy: Math.round(jpy), home: Math.round(jpy * homePerJpy), kind });

  const lines: TripLine[] = [];
  const flightsHome = Math.max(0, i.flightPerPerson || 0) * people;
  lines.push({ id: 'flights', label: `Return flights for ${people}`, jpy: Math.round(flightsHome / homePerJpy), home: Math.round(flightsHome), kind: 'estimate' });
  lines.push(line('stay', `Hotel: ${rooms} room${rooms === 1 ? '' : 's'} × ${nights} night${nights === 1 ? '' : 's'}`, room * rooms * nights, 'estimate'));
  lines.push(line('daily', `Food, local transport and sights × ${days} days`, daily * days * (adults + children * s.childShare), 'estimate'));
  if (i.jrPass) {
    const p = JR_PASS[i.jrPass];
    lines.push(line('jrpass', `Japan Rail Pass, ${i.jrPass} days (official website price)`, p.adult * adults + p.child * children, 'official'));
  }
  const cityTax = tokyo * people * bandTax(perPersonRate, TOKYO_TAX_BANDS) + kyoto * people * bandTax(perPersonRate, KYOTO_TAX_BANDS);
  if (cityTax > 0) lines.push(line('citytax', 'Tokyo and Kyoto accommodation tax', cityTax, 'official'));
  lines.push(line('departure', 'International Tourist Tax (departure tax)', DEPARTURE_TAX_JPY * people, 'official'));
  if (o.visaPerPerson > 0) {
    const visaHome = o.visaPerPerson * people;
    lines.push({ id: 'visa', label: 'Japan visa fee', jpy: Math.round(visaHome / homePerJpy), home: Math.round(visaHome), kind: 'official' });
  }

  const totalJpy = lines.reduce((a, l) => a + l.jpy, 0);
  const totalHome = lines.reduce((a, l) => a + l.home, 0);
  return { nights, people, rooms, lines, totalJpy, totalHome, perPersonHome: Math.round(totalHome / people), homePerJpy };
}
