import type {
  Env,
  MCPRequest,
  MCPResponse,
  MCPToolDefinition,
  MCPToolHandlerMap
} from "../types";

interface MCPProtocolOptions {
  serverName: string;
  serverVersion: string;
  tools: MCPToolDefinition[];
  toolHandlers: MCPToolHandlerMap;
}

export async function handleMcpProtocolRequest(
  request: Request,
  env: Env,
  options: MCPProtocolOptions
): Promise<Response> {
  const body = (await request.json()) as MCPRequest;
  const { method, params = {}, id = null } = body;

  if (method?.startsWith("notifications/") || body.id === undefined) {
    return new Response(null, { status: 202 });
  }

  let result: unknown;

  try {
    switch (method) {
      case "initialize":
        result = {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: {
            name: options.serverName,
            version: options.serverVersion
          }
        };
        break;

      case "tools/list":
        result = { tools: options.tools };
        break;

      case "tools/call": {
        const toolName = (params as { name?: string }).name;
        if (!toolName) throw new Error("Tool name is required");

        const toolHandler = options.toolHandlers[toolName];
        if (!toolHandler) throw new Error(`Unknown tool: ${toolName}`);

        const toolParams =
          (params as { arguments?: Record<string, unknown> }).arguments ?? {};

        const toolResult = await toolHandler(env, toolParams);
        // Sanitize lone surrogates that crash UTF-8 encoders downstream
        const safeText = typeof toolResult === 'string'
          ? toolResult.replace(/[\ud800-\udfff]/g, '\ufffd')
          : toolResult;

        result = {
          content: [{ type: "text", text: safeText }]
        };
        break;
      }

      default:
        throw new Error(`Unknown method: ${method}`);
    }

    const response: MCPResponse = { jsonrpc: "2.0", id, result };
    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("MCP tool error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    const safeErr = errMsg.replace(/[\ud800-\udfff]/g, '\ufffd');
    const response: MCPResponse = {
      jsonrpc: "2.0",
      id,
      error: { code: -32603, message: `Internal tool error: ${errMsg}` }
    };
    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" }
    });
  }
}
