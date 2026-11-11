/**
 * Stateless MCP server (Streamable HTTP, JSON responses) for decisionscalc.com/mcp.
 * Pure: takes a parsed JSON-RPC message, returns the reply (or null for notifications), so it is unit-tested
 * without a network. The Pages Function in functions/mcp.ts handles HTTP.
 */
import { AGENT_TOOLS, toolByName } from './agent-tools';

export const SERVER_INFO = { name: 'decisionscalc', title: 'DecisionsCalc calculators', version: '1.4.0' };
export const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const INSTRUCTIONS = 'Calculators built on official rules (2026 and 2027 rates): Irish welfare and taxes, UK property taxes, Canadian and Quebec parental benefits, Australian health insurance rebate, NZ KiwiSaver, parental leave pay in five countries. '
  + 'Each result includes the calculator page and the official sources; cite them. Estimates only: the relevant government department decides.';

type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: any };
const ok = (id: Rpc['id'], result: unknown) => ({ jsonrpc: '2.0', id, result });
const fail = (id: Rpc['id'], code: number, message: string) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

export function handleRpc(msg: Rpc) {
  if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return fail(msg?.id, -32600, 'Invalid Request');
  const isNotification = !('id' in msg) || msg.id === undefined;
  if (isNotification) return null;
  const { id, method, params } = msg;
  switch (method) {
    case 'initialize': {
      const asked = params?.protocolVersion;
      return ok(id, {
        protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    }
    case 'ping': return ok(id, {});
    case 'tools/list':
      return ok(id, { tools: AGENT_TOOLS.map((t) => ({ name: t.name, title: t.name.replace(/_/g, ' '), description: t.description, inputSchema: t.inputSchema, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } })) });
    case 'tools/call': {
      const tool = toolByName(params?.name);
      if (!tool) return fail(id, -32602, `Unknown tool: ${params?.name}`);
      const args = params?.arguments && typeof params.arguments === 'object' ? params.arguments : {};
      const missing = (tool.inputSchema.required ?? []).filter((k) => args[k] === undefined || args[k] === null || args[k] === '');
      if (missing.length) return ok(id, { content: [{ type: 'text', text: `Missing required input: ${missing.join(', ')}` }], isError: true });
      try {
        const out = tool.run(args) as Record<string, unknown>;
        return ok(id, { content: [{ type: 'text', text: JSON.stringify(out) }], structuredContent: out });
      } catch (e) {
        return ok(id, { content: [{ type: 'text', text: `Could not calculate: ${(e as Error).message}` }], isError: true });
      }
    }
    case 'resources/list': return ok(id, { resources: [] });
    case 'prompts/list': return ok(id, { prompts: [] });
    default: return fail(id, -32601, `Method not found: ${method}`);
  }
}

/** HTTP wrapper: POST JSON-RPC (single or batch). */
export async function handleHttp(request: Request): Promise<Response> {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Protocol-Version, Mcp-Session-Id', 'Cache-Control': 'no-store' };
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return new Response('This is an MCP endpoint (Streamable HTTP). POST JSON-RPC 2.0 messages. Server card: /.well-known/mcp/server-card.json', { status: 405, headers: { ...cors, Allow: 'POST, OPTIONS', 'Content-Type': 'text/plain; charset=utf-8' } });
  const text = await request.text();
  if (text.length > 64_000) return Response.json(fail(null, -32600, 'Request too large'), { status: 413, headers: cors });
  let body: unknown;
  try { body = JSON.parse(text); } catch { return Response.json(fail(null, -32700, 'Parse error'), { status: 400, headers: cors }); }
  const replies = (Array.isArray(body) ? body.slice(0, 20) : [body]).map((m) => handleRpc(m as Rpc)).filter((r) => r !== null);
  if (!replies.length) return new Response(null, { status: 202, headers: cors });
  return Response.json(Array.isArray(body) ? replies : replies[0], { headers: cors });
}
