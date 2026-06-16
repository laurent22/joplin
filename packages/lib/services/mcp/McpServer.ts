import Logger from '@joplin/utils/Logger';
import Setting from '../../models/Setting';
import { allTools, enabledTools, findTool } from './registry';
import { JsonRpcRequest, JsonRpcResponse, JsonRpcErrorCodes, McpProtocolVersion } from './types';

const logger = Logger.create('McpServer');

const SERVER_NAME = 'joplin-mcp';
const SERVER_VERSION = '1.0.0';

// Routes a JSON-RPC request to the matching MCP method. The transport layer
// (HTTP today, possibly stdio later) calls this with a parsed envelope and
// gets back a response envelope to write.
export default class McpServer {

	private static instance_: McpServer;

	public static instance(): McpServer {
		if (!this.instance_) this.instance_ = new McpServer();
		return this.instance_;
	}

	public async handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse | null> {
		const id = request.id ?? null;

		if (request.jsonrpc !== '2.0' || !request.method) {
			return this.errorResponse(id, JsonRpcErrorCodes.InvalidRequest, 'Invalid JSON-RPC request');
		}

		// JSON-RPC notifications (no id) get no response — return null and the
		// transport drops it.
		const isNotification = request.id === undefined || request.id === null;

		try {
			switch (request.method) {
			case 'initialize':
				return this.successResponse(id, this.handleInitialize());
			case 'tools/list':
				return this.successResponse(id, this.handleToolsList());
			case 'tools/call':
				return this.successResponse(id, await this.handleToolsCall(request.params));
			case 'ping':
				return this.successResponse(id, {});
			case 'notifications/initialized':
				return null;
			default:
				if (isNotification) return null;
				return this.errorResponse(id, JsonRpcErrorCodes.MethodNotFound, `Method not found: ${request.method}`);
			}
		} catch (error) {
			logger.error(`Error handling method ${request.method}:`, error);
			if (isNotification) return null;
			return this.errorResponse(id, JsonRpcErrorCodes.InternalError, error.message || 'Internal error');
		}
	}

	private handleInitialize() {
		return {
			protocolVersion: McpProtocolVersion,
			capabilities: {
				tools: {},
			},
			serverInfo: {
				name: SERVER_NAME,
				version: SERVER_VERSION,
			},
		};
	}

	private handleToolsList() {
		return {
			tools: enabledTools().map(t => ({
				name: t.id,
				description: t.description,
				inputSchema: t.inputSchema,
			})),
		};
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- params are JSON-RPC-shaped
	private async handleToolsCall(params: any) {
		if (!params || typeof params.name !== 'string') {
			throw new Error('Missing or invalid "name" parameter');
		}
		const tool = findTool(params.name);
		if (!tool) {
			// "Disabled" vs "unknown" surface differently so the LLM gets actionable feedback.
			const exists = allTools().some(t => t.id === params.name);
			return {
				content: [{ type: 'text', text: exists ? `Tool '${params.name}' is disabled in Joplin settings` : `Unknown tool '${params.name}'` }],
				isError: true,
			};
		}
		const input = params.arguments ?? {};
		return await tool.handler(input);
	}

	private successResponse(id: string | number | null, result: unknown): JsonRpcResponse {
		return { jsonrpc: '2.0', id, result };
	}

	private errorResponse(id: string | number | null, code: number, message: string): JsonRpcResponse {
		return { jsonrpc: '2.0', id, error: { code, message } };
	}

	public isEnabled(): boolean {
		return Setting.value('mcp.enabled') as boolean;
	}
}
