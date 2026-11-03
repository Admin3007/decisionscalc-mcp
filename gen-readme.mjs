// Prints the tool table for README.md from the real definitions (run with: node --experimental-strip-types gen-readme.mjs)
import { AGENT_TOOLS } from './src/lib/agent-tools.ts';
for (const t of AGENT_TOOLS) console.log(`| \`${t.name}\` | ${t.description.replace(/\|/g, '/')} | [page](https://decisionscalc.com${t.page}) |`);
