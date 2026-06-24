import Setting from '../../models/Setting';
import Note from '../../models/Note';
import Folder from '../../models/Folder';
import Tag from '../../models/Tag';
import SearchEngine from '../search/SearchEngine';
import { db, setupDatabaseAndSynchronizer, switchClient, withWarningSilenced } from '../../testing/test-utils';
import McpServer from './McpServer';
import { McpProtocolVersion } from './types';

const allToolSettings = [
	'mcp.tool.search_notes.enabled',
	'mcp.tool.semantic_search_notes.enabled',
	'mcp.tool.read_note.enabled',
	'mcp.tool.list_notebooks.enabled',
	'mcp.tool.list_tags.enabled',
	'mcp.tool.create_note.enabled',
	'mcp.tool.update_note.enabled',
	'mcp.tool.delete_note.enabled',
	'mcp.tool.manage_tags.enabled',
	'mcp.tool.create_notebook.enabled',
];

const enableAllTools = () => {
	for (const s of allToolSettings) Setting.setValue(s, true);
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

	test('returns InvalidParams for malformed tools/call params', async () => {
		await withWarningSilenced(/Missing or invalid "name" parameter/, async () => {
			const response = await McpServer.instance().handleRequest({
				jsonrpc: '2.0', id: 1, method: 'tools/call', params: {},
			});
			expect(response.error.code).toBe(-32602);
		});
	});

	test('responds to id: null requests instead of treating them as notifications', async () => {
		const response = await McpServer.instance().handleRequest({
			jsonrpc: '2.0', id: null, method: 'tools/list',
		});
		expect(response).not.toBeNull();
		expect(response.id).toBeNull();
		expect(response.result.tools.length).toBeGreaterThan(0);
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

	test('read_note refuses trashed notes', async () => {
		const folder = await Folder.save({ title: 'F' });
		const trashed = await Note.save({ title: 'Gone', parent_id: folder.id, deleted_time: Date.now() });

		const response = await McpServer.instance().handleRequest({
			jsonrpc: '2.0', id: 1, method: 'tools/call',
			params: { name: 'read_note', arguments: { id: trashed.id } },
		});
		expect(response.result.isError).toBe(true);
	});

	test('list_notebooks returns id title parent_id and note_count', async () => {
		const parent = await Folder.save({ title: 'Parent' });
		const child = await Folder.save({ title: 'Child', parent_id: parent.id });
		await Note.save({ title: 'n1', parent_id: child.id });
		await Note.save({ title: 'n2', parent_id: child.id });

		const response = await McpServer.instance().handleRequest({
			jsonrpc: '2.0', id: 1, method: 'tools/call',
			params: { name: 'list_notebooks', arguments: {} },
		});
		const payload = parseToolResult(response.result);
		const parentEntry = payload.notebooks.find((n: { id: string }) => n.id === parent.id);
		const childEntry = payload.notebooks.find((n: { id: string }) => n.id === child.id);
		expect(childEntry.parent_id).toBe(parent.id);
		expect(childEntry.note_count).toBe(2);
		expect(parentEntry.note_count).toBe(0);
	});

	test('search_notes returns a snippet anchored on the keyword', async () => {
		const folder = await Folder.save({ title: 'F' });
		const body = `${'lorem '.repeat(60)}pet sitters ${'ipsum '.repeat(60)}`;
		await Note.save({ title: 'Recommendations', body, parent_id: folder.id });

		SearchEngine.instance().setDb(db());
		await SearchEngine.instance().syncTables();

		const response = await McpServer.instance().handleRequest({
			jsonrpc: '2.0', id: 1, method: 'tools/call',
			params: { name: 'search_notes', arguments: { query: 'sitters' } },
		});
		const payload = parseToolResult(response.result);
		expect(payload.results.length).toBe(1);
		expect(payload.results[0].snippet).toMatch(/pet sitters/);
		expect(payload.results[0].snippet.length).toBeLessThan(body.length);
	});

	test('read_note pages the body when max_chars is set', async () => {
		const folder = await Folder.save({ title: 'F' });
		const body = '0123456789';
		const note = await Note.save({ title: 'Slice', body, parent_id: folder.id });

		const response = await McpServer.instance().handleRequest({
			jsonrpc: '2.0', id: 1, method: 'tools/call',
			params: { name: 'read_note', arguments: { id: note.id, offset: 2, max_chars: 4 } },
		});
		const payload = parseToolResult(response.result);
		expect(payload.body).toBe('2345');
		expect(payload.body_offset).toBe(2);
		expect(payload.body_length).toBe(10);
		expect(payload.has_more).toBe(true);
	});

	test('delete_note moves a note to trash', async () => {
		const folder = await Folder.save({ title: 'F' });
		const note = await Note.save({ title: 'Doomed', parent_id: folder.id });

		await McpServer.instance().handleRequest({
			jsonrpc: '2.0', id: 1, method: 'tools/call',
			params: { name: 'delete_note', arguments: { id: note.id } },
		});

		const reloaded = await Note.load(note.id);
		expect(reloaded.deleted_time).toBeGreaterThan(0);
	});

	test('manage_tags adds and removes tags by title', async () => {
		const folder = await Folder.save({ title: 'F' });
		const note = await Note.save({ title: 'Tagged', parent_id: folder.id });

		await McpServer.instance().handleRequest({
			jsonrpc: '2.0', id: 1, method: 'tools/call',
			params: { name: 'manage_tags', arguments: { note_id: note.id, add: ['alpha', 'beta'] } },
		});
		let tags = await Tag.tagsByNoteId(note.id);
		expect(tags.map(t => t.title).sort()).toEqual(['alpha', 'beta']);

		await McpServer.instance().handleRequest({
			jsonrpc: '2.0', id: 1, method: 'tools/call',
			params: { name: 'manage_tags', arguments: { note_id: note.id, remove: ['alpha'] } },
		});
		tags = await Tag.tagsByNoteId(note.id);
		expect(tags.map(t => t.title)).toEqual(['beta']);
	});

	test('create_notebook creates a notebook under a parent', async () => {
		const parent = await Folder.save({ title: 'Parent' });

		const response = await McpServer.instance().handleRequest({
			jsonrpc: '2.0', id: 1, method: 'tools/call',
			params: { name: 'create_notebook', arguments: { title: 'Child', parent_id: parent.id } },
		});
		const payload = parseToolResult(response.result);
		const reloaded = await Folder.load(payload.id);
		expect(reloaded.title).toBe('Child');
		expect(reloaded.parent_id).toBe(parent.id);
	});

	test('update_note append adds text to the existing body', async () => {
		const folder = await Folder.save({ title: 'F' });
		const note = await Note.save({ title: 't', body: 'start', parent_id: folder.id });

		await McpServer.instance().handleRequest({
			jsonrpc: '2.0', id: 1, method: 'tools/call',
			params: { name: 'update_note', arguments: { id: note.id, append: '-end' } },
		});

		const reloaded = await Note.load(note.id);
		expect(reloaded.body).toBe('start-end');
	});

	test('update_note replace_text fails on ambiguous match', async () => {
		const folder = await Folder.save({ title: 'F' });
		const note = await Note.save({ title: 't', body: 'foo bar foo', parent_id: folder.id });

		const response = await McpServer.instance().handleRequest({
			jsonrpc: '2.0', id: 1, method: 'tools/call',
			params: { name: 'update_note', arguments: { id: note.id, replace_text: { find: 'foo', replace: 'baz' } } },
		});
		expect(response.result.isError).toBe(true);
		const reloaded = await Note.load(note.id);
		expect(reloaded.body).toBe('foo bar foo');
	});

	test('update_note replace_text fails when find is missing', async () => {
		const folder = await Folder.save({ title: 'F' });
		const note = await Note.save({ title: 't', body: 'hello', parent_id: folder.id });

		const response = await McpServer.instance().handleRequest({
			jsonrpc: '2.0', id: 1, method: 'tools/call',
			params: { name: 'update_note', arguments: { id: note.id, replace_text: { find: 'world', replace: 'x' } } },
		});
		expect(response.result.isError).toBe(true);
	});

	test('update_note replace_text replaces a unique match', async () => {
		const folder = await Folder.save({ title: 'F' });
		const note = await Note.save({ title: 't', body: 'hello world', parent_id: folder.id });

		await McpServer.instance().handleRequest({
			jsonrpc: '2.0', id: 1, method: 'tools/call',
			params: { name: 'update_note', arguments: { id: note.id, replace_text: { find: 'world', replace: 'there' } } },
		});

		const reloaded = await Note.load(note.id);
		expect(reloaded.body).toBe('hello there');
	});

	test('handler throwing a plain Error surfaces as JSON-RPC InternalError, not a tool error', async () => {
		// Forge an internal-bug scenario by passing a clearly invalid id format
		// straight through; the Note model will throw an internal Error rather
		// than ToolError when SQL fails on it. (We rely on the dispatcher's
		// distinction here: ToolError → isError:true, anything else → JSON-RPC error.)
		jest.spyOn(Note, 'load').mockRejectedValueOnce(new Error('forged internal failure'));

		await withWarningSilenced(/forged internal failure/, async () => {
			const response = await McpServer.instance().handleRequest({
				jsonrpc: '2.0', id: 1, method: 'tools/call',
				params: { name: 'read_note', arguments: { id: 'a'.repeat(32) } },
			});
			expect(response.result).toBeUndefined();
			expect(response.error.code).toBe(-32603);
			expect(response.error.message).toMatch(/forged internal failure/);
		});
	});

	test('semantic_search_notes returns a clear error when AI is off', async () => {
		const response = await McpServer.instance().handleRequest({
			jsonrpc: '2.0', id: 1, method: 'tools/call',
			params: { name: 'semantic_search_notes', arguments: { query: 'anything' } },
		});
		expect(response.result.isError).toBe(true);
		expect(response.result.content[0].text).toMatch(/embedding|AI/);
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
