import Setting from '../../models/Setting';
import { McpTool } from './types';

import searchNotes from './tools/searchNotes';
import readNote from './tools/readNote';
import listNotebooks from './tools/listNotebooks';
import listTags from './tools/listTags';
import createNote from './tools/createNote';
import updateNote from './tools/updateNote';

// Every tool registered here gets an `mcp.tool.<id>.enabled` setting (see
// builtInMetadata.ts). Adding a tool to this list without also adding the
// setting means it will be reported as enabled by default — keep them in sync.
const ALL_TOOLS: McpTool[] = [
	searchNotes,
	readNote,
	listNotebooks,
	listTags,
	createNote,
	updateNote,
];

export const allTools = (): McpTool[] => ALL_TOOLS;

export const enabledTools = (): McpTool[] => {
	return ALL_TOOLS.filter(t => Setting.value(`mcp.tool.${t.id}.enabled`) as boolean);
};

export const findTool = (id: string): McpTool | null => {
	const t = ALL_TOOLS.find(t => t.id === id);
	if (!t) return null;
	if (!(Setting.value(`mcp.tool.${t.id}.enabled`) as boolean)) return null;
	return t;
};
