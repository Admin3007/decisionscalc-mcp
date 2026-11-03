// decisionscalc.com/mcp: calculator tools for AI agents (MCP, Streamable HTTP). Logic in src/lib/mcp-server.ts.
import { handleHttp } from '../src/lib/mcp-server';

export const onRequest = ({ request }: { request: Request }) => handleHttp(request);
