import Setting from '../../models/Setting';
import Note from '../../models/Note';
import Folder from '../../models/Folder';
import Tag from '../../models/Tag';
import { setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import McpServer from './McpServer';
import { McpProtocolVersion } from './types';

const ALL_TOOL_SETTINGS = [
	'mcp.tool.search_notes.enabled',
	'mcp.tool.read_note.enabled',
	'mcp.tool.list_notebooks.enabled',
	'mcp.tool.list_tags.enabled',
	'mcp.tool.create_note.enabled',
	'mcp.tool.update_note.enabled',
];

const enableAllTools = () => {
	for (const s of ALL_TOOL_SETTINGS) Setting.setValue(s, true);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test helper unwraps MCP text payloads
const parseToolResult = (result: any) => JSON.parse(result.content[0].text);

describe('McpServer', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		Setting.setValue('mcp.enabled', true);
		enableAllTools();
	});

	test('returns protocol version and server info on initialize', async () => {
		const response = await McpServer.instance().handleRequest({
			jsonrpc: '2.0', id: 1, method: 'initialize', params: {},
		});
		expect(response.result.protocolVersion).toBe(McpProtocolVersion);
		expect(response.result.serverInfo.name).toBe('joplin-mcp');
		expect(response.result.capabilities.tools).toBeDefined();
	});

	test('lists enabled tools only', async () => {
		Setting.setValue('mcp.tool.create_note.enabled', false);
		Setting.setValue('mcp.tool.update_note.enabled', false);

		const response = await McpServer.instance().handleRequest({
			jsonrpc: '2.0', id: 1, method: 'tools/list',
		});
		const names = response.result.tools.map((t: { name: string }) => t.name);
		expect(names).toEqual(expect.arrayContaining(['search_notes', 'read_note', 'list_notebooks', 'list_tags']));
		expect(names).not.toContain('create_note');
		expect(names).not.toContain('update_note');
	});

	test('returns MethodNotFound for unknown methods', async () => {
		const response = await McpServer.instance().handleRequest({
			jsonrpc: '2.0', id: 1, method: 'bogus/method',
		});
		expect(response.error.code).toBe(-32601);
	});

	test('returns isError when calling a disabled tool', async () => {
		Setting.setValue('mcp.tool.search_notes.enabled', false);
		const response = await McpServer.instance().handleRequest({
			jsonrpc: '2.0', id: 1, method: 'tools/call',
			params: { name: 'search_notes', arguments: { query: 'x' } },
		});
		expect(response.result.isError).toBe(true);
		expect(response.result.content[0].text).toMatch(/disabled/);
	});

	test('returns isError for unknown tools', async () => {
		const response = await McpServer.instance().handleRequest({
			jsonrpc: '2.0', id: 1, method: 'tools/call',
			params: { name: 'no_such_tool', arguments: {} },
		});
		expect(response.result.isError).toBe(true);
		expect(response.result.content[0].text).toMatch(/Unknown tool/);
	});

	test('returns null for notifications and never errors on them', async () => {
		const response = await McpServer.instance().handleRequest({
			jsonrpc: '2.0', method: 'notifications/initialized',
		});
		expect(response).toBeNull();
	});

	test('read_note returns title body notebook and tags', async () => {
		const folder = await Folder.save({ title: 'Work' });
		const note = await Note.save({ title: 'Meeting notes', body: 'Discuss roadmap', parent_id: folder.id });
		const tag = await Tag.save({ title: 'important' });
		await Tag.addNote(tag.id, note.id);

		const response = await McpServer.instance().handleRequest({
			jsonrpc: '2.0', id: 1, method: 'tools/call',
			params: { name: 'read_note', arguments: { id: note.id } },
		});
		const payload = parseToolResult(response.result);
		expect(payload.title).toBe('Meeting notes');
		expect(payload.body).toBe('Discuss roadmap');
		expect(payload.notebook_title).toBe('Work');
		expect(payload.tags).toEqual(['important']);
	});

	test('read_note refuses trashed and conflict notes', async () => {
		const folder = await Folder.save({ title: 'F' });
		const trashed = await Note.save({ title: 'Gone', parent_id: folder.id, deleted_time: Date.now() });

		const response = await McpServer.instance().handleRequest({
			jsonrpc: '2.0', id: 1, method: 'tools/call',
			params: { name: 'read_note', arguments: { id: trashed.id } },
		});
		expect(response.result.isError).toBe(true);
	});

	test('list_notebooks returns id title and parent_id', async () => {
		const parent = await Folder.save({ title: 'Parent' });
		const child = await Folder.save({ title: 'Child', parent_id: parent.id });

		const response = await McpServer.instance().handleRequest({
			jsonrpc: '2.0', id: 1, method: 'tools/call',
			params: { name: 'list_notebooks', arguments: {} },
		});
		const payload = parseToolResult(response.result);
		const childEntry = payload.notebooks.find((n: { id: string }) => n.id === child.id);
		expect(childEntry.parent_id).toBe(parent.id);
		expect(payload.notebooks.length).toBe(2);
	});

	test('create_note creates a note in the chosen notebook', async () => {
		const folder = await Folder.save({ title: 'Inbox' });

		const response = await McpServer.instance().handleRequest({
			jsonrpc: '2.0', id: 1, method: 'tools/call',
			params: { name: 'create_note', arguments: { title: 'Hi', body: 'Body', notebook_id: folder.id } },
		});
		const payload = parseToolResult(response.result);
		const saved = await Note.load(payload.id);
		expect(saved.title).toBe('Hi');
		expect(saved.body).toBe('Body');
		expect(saved.parent_id).toBe(folder.id);
	});

	test('create_note rejects an unknown notebook', async () => {
		const response = await McpServer.instance().handleRequest({
			jsonrpc: '2.0', id: 1, method: 'tools/call',
			params: { name: 'create_note', arguments: { title: 'x', notebook_id: 'doesnotexist00000000000000000000' } },
		});
		expect(response.result.isError).toBe(true);
	});

	test('update_note only changes the fields passed', async () => {
		const folder = await Folder.save({ title: 'F' });
		const note = await Note.save({ title: 'Original', body: 'Keep', parent_id: folder.id });

		await McpServer.instance().handleRequest({
			jsonrpc: '2.0', id: 1, method: 'tools/call',
			params: { name: 'update_note', arguments: { id: note.id, title: 'New' } },
		});

		const updated = await Note.load(note.id);
		expect(updated.title).toBe('New');
		expect(updated.body).toBe('Keep');
	});
});
