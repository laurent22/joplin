import { Request, RequestMethod } from '../Api';
import { ErrorBadRequest, ErrorForbidden, ErrorMethodNotAllowed } from '../utils/errors';
import Setting from '../../../models/Setting';
import McpServer from '../../mcp/McpServer';
import { JsonRpcRequest, JsonRpcResponse } from '../../mcp/types';

// Single-endpoint JSON-RPC transport. v1 only handles client-initiated
// requests so plain POST/response is enough; streamable HTTP can come later
// if we ever need server-initiated messages.
export default async function(request: Request) {
	if (request.method !== RequestMethod.POST) throw new ErrorMethodNotAllowed();

	if (!(Setting.value('mcp.enabled') as boolean)) {
		throw new ErrorForbidden('MCP server is disabled');
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON-RPC envelope is dynamically shaped
	let payload: any;
	try {
		payload = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
	} catch (error) {
		throw new ErrorBadRequest('Invalid JSON body');
	}

	const server = McpServer.instance();

	// JSON-RPC batch: spec allows an array of requests. If every item is a
	// notification, the server must return nothing (empty body), same as the
	// single-notification case.
	if (Array.isArray(payload)) {
		const responses: JsonRpcResponse[] = [];
		for (const item of payload) {
			const r = await server.handleRequest(item as JsonRpcRequest);
			if (r) responses.push(r);
		}
		if (!responses.length) return '';
		return responses;
	}

	const response = await server.handleRequest(payload as JsonRpcRequest);
	// Notifications get no body per JSON-RPC spec.
	if (!response) return '';
	return response;
}
