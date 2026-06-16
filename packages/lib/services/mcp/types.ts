// eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON Schema is arbitrary nested JSON
export type JsonSchema = { type: string;[key: string]: any };

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tool input shape varies per schema
export type ToolInput = Record<string, any>;

export interface ToolTextContent {
	type: 'text';
	text: string;
}

// MCP also allows image and resource content; v1 ships text only.
export type ToolContent = ToolTextContent;

export interface ToolCallResult {
	content: ToolContent[];
	isError?: boolean;
}

export interface McpTool {
	id: string;
	description: string;
	inputSchema: JsonSchema;
	handler: (input: ToolInput)=> Promise<ToolCallResult>;
}

export interface JsonRpcRequest {
	jsonrpc: '2.0';
	id?: string | number | null;
	method: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- params shape varies per method
	params?: any;
}

export interface JsonRpcError {
	code: number;
	message: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- data is method-specific
	data?: any;
}

export interface JsonRpcResponse {
	jsonrpc: '2.0';
	id: string | number | null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- result shape varies per method
	result?: any;
	error?: JsonRpcError;
}

// Protocol-level errors use -32xxx; application errors come back as
// result.isError=true so the LLM sees them.
export const JsonRpcErrorCodes = {
	ParseError: -32700,
	InvalidRequest: -32600,
	MethodNotFound: -32601,
	InvalidParams: -32602,
	InternalError: -32603,
};

export const McpProtocolVersion = '2025-06-18';
