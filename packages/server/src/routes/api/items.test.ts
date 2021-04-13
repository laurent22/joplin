import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession, models, createItem, makeTempFileWithContent } from '../../utils/testing/testUtils';
import { NoteEntity } from '@joplin/lib/services/database/types';
import { ModelType } from '@joplin/lib/BaseModel';
import { getApi, putApi } from '../../utils/testing/apiUtils';
import { Item } from '../../db';
import { PaginatedItems } from '../../models/ItemModel';

function makeNoteSerializedBody(note: NoteEntity = {}): string {
	return `${'title' in note ? note.title : 'Title'}

${'body' in note ? note.body : 'Body'}

id: ${'id' in note ? note.id : 'b39dadd7a63742bebf3125fd2a9286d4'}
parent_id: ${'parent_id' in note ? note.parent_id : '000000000000000000000000000000F1'}
created_time: 2020-10-15T10:34:16.044Z
updated_time: 2021-01-28T23:10:30.054Z
is_conflict: 0
latitude: 0.00000000
longitude: 0.00000000
altitude: 0.0000
author: 
source_url: 
is_todo: 1
todo_due: 1602760405000
todo_completed: 0
source: joplindev-desktop
source_application: net.cozic.joplindev-desktop
application_data: 
order: 0
user_created_time: 2020-10-15T10:34:16.044Z
user_updated_time: 2020-10-19T17:21:03.394Z
encryption_cipher_text: 
encryption_applied: 0
markup_language: 1
is_shared: 1
type_: 1`;
}

describe('api_items', function() {

	beforeAll(async () => {
		await beforeAllDb('api_items');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should create an item', async function() {
		const { user, session } = await createUserAndSession(1, true);

		const noteId = '00000000000000000000000000000001';
		const folderId = '000000000000000000000000000000F1';
		const noteTitle = 'Title';
		const noteBody = 'Body';
		const filename = `${noteId}.md`;
		let item = await createItem(session.id, `root:/${filename}:`, makeNoteSerializedBody({
			id: noteId,
			title: noteTitle,
			body: noteBody,
		}));

		item = await models().item({ userId: user.id }).loadByName(filename);
		const itemId = item.id;

		expect(!!item.id).toBe(true);
		expect(item.name).toBe(filename);
		expect(item.mime_type).toBe('text/markdown');
		expect(item.jop_id).toBe(noteId);
		expect(item.jop_parent_id).toBe(folderId);
		expect(item.jop_encryption_applied).toBe(0);
		expect(item.jop_type).toBe(ModelType.Note);
		expect(!item.content).toBe(true);
		expect(item.content_size).toBeGreaterThan(0);

		{
			const item: NoteEntity = await models().item({ userId: user.id }).loadAsJoplinItem(itemId);
			expect(item.title).toBe(noteTitle);
			expect(item.body).toBe(noteBody);
		}
	});

	test('should modify an item', async function() {
		const { user, session } = await createUserAndSession(1, true);

		const noteId = '00000000000000000000000000000001';
		const filename = `${noteId}.md`;
		const item = await createItem(session.id, `root:/${filename}:`, makeNoteSerializedBody({
			id: noteId,
		}));

		const newParentId = '000000000000000000000000000000F2';
		const tempFilePath = await makeTempFileWithContent(makeNoteSerializedBody({
			parent_id: newParentId,
			title: 'new title',
		}));

		await putApi(session.id, `items/root:/${filename}:/content`, null, { filePath: tempFilePath });

		const note: NoteEntity = await models().item({ userId: user.id }).loadAsJoplinItem(item.id);
		expect(note.parent_id).toBe(newParentId);
		expect(note.title).toBe('new title');
	});

	test('should get back the serialized note', async function() {
		const { session } = await createUserAndSession(1, true);

		const noteId = '00000000000000000000000000000001';
		const filename = `${noteId}.md`;
		const serializedNote = makeNoteSerializedBody({
			id: noteId,
		});
		await createItem(session.id, `root:/${filename}:`, serializedNote);

		const result = await getApi(session.id, `items/root:/${filename}:/content`);
		expect(result).toBe(serializedNote);
	});

	test('should get back the item metadata', async function() {
		const { session } = await createUserAndSession(1, true);

		const noteId = '00000000000000000000000000000001';
		await createItem(session.id, `root:/${noteId}.md:`, makeNoteSerializedBody({
			id: noteId,
		}));

		const result: Item = await getApi(session.id, `items/root:/${noteId}.md:`);
		expect(result.name).toBe(`${noteId}.md`);
	});

	test('should list children', async function() {
		const { session } = await createUserAndSession(1, true);

		const itemNames = [
			'.resource/r1',
			'locks/1.json',
			'locks/2.json',
		];

		for (const itemName of itemNames) {
			await createItem(session.id, `root:/${itemName}:`, `Content for :${itemName}`);
		}

		const noteIds: string[] = [];

		for (let i = 1; i <= 3; i++) {
			const noteId = `0000000000000000000000000000000${i}`;
			noteIds.push(noteId);
			await createItem(session.id, `root:/${noteId}.md:`, makeNoteSerializedBody({
				id: noteId,
			}));
		}

		// Get all children

		{
			const result1: PaginatedItems = await getApi(session.id, 'items/root:/:/children', { query: { limit: 4 } });
			expect(result1.items.length).toBe(4);
			expect(result1.has_more).toBe(true);

			const result2: PaginatedItems = await getApi(session.id, 'items/root:/:/children', { query: { cursor: result1.cursor } });
			expect(result2.items.length).toBe(2);
			expect(result2.has_more).toBe(false);

			const items = result1.items.concat(result2.items);

			for (const itemName of itemNames) {
				expect(!!items.find(it => it.name === itemName)).toBe(true);
			}

			for (const noteId of noteIds) {
				expect(!!items.find(it => it.name === `${noteId}.md`)).toBe(true);
			}
		}

		// Get sub-children

		{
			const result: PaginatedItems = await getApi(session.id, 'items/root:/locks/*:/children');
			expect(result.items.length).toBe(2);
			expect(!!result.items.find(it => it.name === 'locks/1.json')).toBe(true);
			expect(!!result.items.find(it => it.name === 'locks/2.json')).toBe(true);
		}
	});

});
