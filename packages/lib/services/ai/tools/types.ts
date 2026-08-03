import { JsonSchema } from '../types';

export interface EditorCommands {
	replaceSelection: (text: string, originalText: string)=> Promise<void>;
	updateNoteBody: (body: string, originalBody: string)=> Promise<void>;
}

export interface NoteContext {
	title: string;
	noteId: string;
	folderId: string;
	body: string;
	selection: string | null;
}

export interface EditorToolContext {
	note: NoteContext;
	commands: EditorCommands;
}

export type ToolInput = Record<string, unknown>;

// Throw this from a tool handler for failure modes the LLM should see and
// recover from (note not found, ambiguous match, missing parameter, etc.).
// Plain Errors are treated as internal bugs.
export class ToolError extends Error {}

export class ToolImageResponse {
	public constructor(public readonly dataUrl: string, public readonly mimeType: string) {}

	public get length() {
		return this.dataUrl.length;
	}

	public get base64Only() {
		return this.dataUrl.replace(/^data:[^;]+;base64,/, '');
	}
}

export type ToolOutput = string|Record<string, unknown>|ToolImageResponse;

export interface ToolSpec {
	id: string;
	description: string;
	// Information provided by the model to the tool
	inputSchema: JsonSchema;
}

export interface ToolContext {
	selectedFolderId?: string;
}

export type ToolDefinition<Output extends ToolOutput|unknown = unknown> = ToolSpec & {
	enabled?: boolean;
	handler: (input: ToolInput, context: ToolContext)=> Promise<Output>;
	// A human-readable description of an action completed by the tool
	userDescription: (input: ToolInput, output: Output)=> string;
};
