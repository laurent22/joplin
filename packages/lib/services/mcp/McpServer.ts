import Logger from '@joplin/utils/Logger';
import Setting from '../../models/Setting';
import ToolIndex from '../ai/tools/ToolIndex';
import { JsonRpcRequest, JsonRpcResponse, JsonRpcErrorCodes, McpProtocolVersion, ToolCallResult, ToolContent, ToolTextContent } from './types';
import { ToolError, ToolImageResponse, ToolOutput } from '../ai/tools/types';

const logger = Logger.create('McpServer');

const serverName = 'joplin-mcp';
const serverVersion = '1.0.0';

class InvalidParamsError extends Error {}

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
		// Per JSON-RPC 2.0: a request without an id field is a notification
		// (no response). id: null is a real request and must get a response
		// with id: null, so it isn't a notification.
		const isNotification = request.id === undefined;
		const id = request.id ?? null;

		if (request.jsonrpc !== '2.0' || !request.method) {
			if (isNotification) return null;
			return this.errorResponse(id, JsonRpcErrorCodes.InvalidRequest, 'Invalid JSON-RPC request');
		}

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
			if (error instanceof InvalidParamsError) {
				return this.errorResponse(id, JsonRpcErrorCodes.InvalidParams, error.message);
			}
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
				name: serverName,
				version: serverVersion,
			},
		};
	}

	private handleToolsList() {
		return {
			tools: new ToolIndex(null).getTools().map(t => ({
				name: t.id,
				description: t.description,
				inputSchema: t.inputSchema,
			})),
		};
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- params are JSON-RPC-shaped
	private async handleToolsCall(params: any): Promise<ToolCallResult> {
		if (!params || typeof params.name !== 'string') {
			throw new InvalidParamsError('Missing or invalid "name" parameter');
		}
		const index = new ToolIndex(null);
		const tool = index.findTool(params.name);
		if (!tool) {
			return toolErrorResult(index.describeToolNotFoundFailure(params.name));
		}
		const input = params.arguments ?? {};
		try {
			const payload = await tool.handler(input, {}) as ToolOutput;

			return {
				content: [serialisePayload(payload)],
			};
		} catch (error) {
			if (error instanceof ToolError) {
				return toolErrorResult(error.message);
			}
			// Internal bug — let it bubble to the JSON-RPC layer as InternalError.
			throw error;
		}
	}

	private successResponse(id: string | number | null, result: unknown): JsonRpcResponse {
		return { jsonrpc: '2.0', id, result };
	}

	private errorResponse(id: string | number | null, code: number, message: string): JsonRpcResponse {
		return { jsonrpc: '2.0', id, error: { code, message } };
	}

	public isEnabled() {
		return Setting.value('mcp.enabled') as boolean;
	}
}

const toolErrorResult = (message: string): ToolCallResult => ({
	content: [{ type: 'text', text: message }],
	isError: true,
});

// MCP content is always text, so we JSON-serialise objects/arrays and pass
// strings through unchanged. null/undefined collapse to an empty string.
const serialisePayload = (payload: unknown): ToolContent => {
	const textResponse = (text: string): ToolTextContent => ({
		type: 'text', text,
	});
	if (payload === null || payload === undefined) return textResponse('');
	if (typeof payload === 'string') return textResponse(payload);
	if (payload instanceof ToolImageResponse) {
		return {
			type: 'image',
			data: payload.base64Only,
			mimeType: payload.mimeType,
		};
	}
	return textResponse(JSON.stringify(payload, null, 2));
};
