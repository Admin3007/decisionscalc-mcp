/**
 * WebMCP: lets an AI agent in the visitor's browser call our calculators as tools (navigator/document.modelContext).
 * Loaded on every page; the tool definitions are fetched only when the browser supports WebMCP, so ordinary
 * visitors download nothing extra. Same definitions as the /mcp server (src/lib/agent-tools.ts).
 */
export async function registerWebMcp() {
  const mc = (document as any).modelContext ?? (navigator as any).modelContext;
  if (!mc || typeof mc.registerTool !== 'function') return;
  const { AGENT_TOOLS } = await import('./agent-tools');
  for (const t of AGENT_TOOLS) {
    try {
      mc.registerTool({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
        annotations: { readOnlyHint: true },
        execute: async (args: unknown) => ({ content: [{ type: 'text', text: JSON.stringify(t.run(args ?? {})) }] }),
      });
    } catch { /* already registered or unsupported shape: never break the page */ }
  }
}
