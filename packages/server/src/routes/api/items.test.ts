import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession, models, createItem, makeTempFileWithContent, makeNoteSerializedBody, createItemTree, expectHttpError, createNote, expectNoHttpError, getItem } from '../../utils/testing/testUtils';
import { NoteEntity } from '@joplin/lib/services/database/types';
import { ModelType } from '@joplin/lib/BaseModel';
import { deleteApi, getApi, putApi } from '../../utils/testing/apiUtils';
import { Item } from '../../services/database/types';
import { PaginatedItems, SaveFromRawContentResult } from '../../models/ItemModel';
import { shareFolderWithUser } from '../../utils/testing/shareApiUtils';
import { resourceBlobPath } from '../../utils/joplinUtils';
import { ErrorForbidden, ErrorPayloadTooLarge } from '../../utils/errors';
import { PaginatedResults } from '../../models/utils/pagination';

describe('api/items', () => {

	beforeAll(async () => {
		await beforeAllDb('api/items');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should create an item', async () => {
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

		item = await models().item().loadByName(user.id, filename);
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
		expect(item.owner_id).toBe(user.id);

		{
			const item: NoteEntity = await models().item().loadAsJoplinItem(itemId);
			expect(item.title).toBe(noteTitle);
			expect(item.body).toBe(noteBody);
		}
	});

	test('should modify an item', async () => {
		const { session } = await createUserAndSession(1, true);

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

		const note: NoteEntity = await models().item().loadAsJoplinItem(item.id);
		expect(note.parent_id).toBe(newParentId);
		expect(note.title).toBe('new title');
	});

	test('should delete an item', async () => {
		const { user, session } = await createUserAndSession(1, true);

		const tree: any = {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		};

		const itemModel = models().item();

		await createItemTree(user.id, '', tree);

		await deleteApi(session.id, 'items/root:/00000000000000000000000000000001.md:');

		expect((await itemModel.all()).length).toBe(1);
		expect((await itemModel.all())[0].jop_id).toBe('000000000000000000000000000000F1');
	});

	test('should delete all items', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1, true);
		const { user: user2 } = await createUserAndSession(2, true);

		await createItemTree(user1.id, '', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		});

		const itemModel2 = models().item();

		await createItemTree(user2.id, '', {
			'000000000000000000000000000000F2': {
				'00000000000000000000000000000002': null,
			},
		});

		await deleteApi(session1.id, 'items/root');

		const allItems = await itemModel2.all();
		expect(allItems.length).toBe(2);
		const ids = allItems.map(i => i.jop_id);
		expect(ids.sort()).toEqual(['000000000000000000000000000000F2', '00000000000000000000000000000002'].sort());
	});

	test('should get back the serialized note', async () => {
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

	test('should get back the item metadata', async () => {
		const { session } = await createUserAndSession(1, true);

		const noteId = '00000000000000000000000000000001';
		await createItem(session.id, `root:/${noteId}.md:`, makeNoteSerializedBody({
			id: noteId,
		}));

		const result: Item = await getApi(session.id, `items/root:/${noteId}.md:`);
		expect(result.name).toBe(`${noteId}.md`);
	});

	test('should batch upload items', async () => {
		const { session: session1 } = await createUserAndSession(1, false);

		const result: PaginatedResults<any> = await putApi(session1.id, 'batch_items', {
			items: [
				{
					name: '00000000000000000000000000000001.md',
					body: makeNoteSerializedBody({ id: '00000000000000000000000000000001' }),
				},
				{
					name: '00000000000000000000000000000002.md',
					body: makeNoteSerializedBody({ id: '00000000000000000000000000000002' }),
				},
			],
		});

		expect(Object.keys(result.items).length).toBe(2);
		expect(Object.keys(result.items).sort()).toEqual(['00000000000000000000000000000001.md', '00000000000000000000000000000002.md']);
	});

	test('should report errors when batch uploading', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1, false);

		const note1 = makeNoteSerializedBody({ id: '00000000000000000000000000000001' });
		await models().user().save({ id: user1.id, max_item_size: note1.length });

		const result: PaginatedResults<any> = await putApi(session1.id, 'batch_items', {
			items: [
				{
					name: '00000000000000000000000000000001.md',
					body: note1,
				},
				{
					name: '00000000000000000000000000000002.md',
					body: makeNoteSerializedBody({ id: '00000000000000000000000000000002', body: 'too large' }),
				},
			],
		});

		const items: SaveFromRawContentResult = result.items as any;

		expect(Object.keys(items).length).toBe(2);
		expect(Object.keys(items).sort()).toEqual(['00000000000000000000000000000001.md', '00000000000000000000000000000002.md']);

		expect(items['00000000000000000000000000000001.md'].item).toBeTruthy();
		expect(items['00000000000000000000000000000001.md'].error).toBeFalsy();
		expect(items['00000000000000000000000000000002.md'].item).toBeFalsy();
		expect(items['00000000000000000000000000000002.md'].error.httpCode).toBe(ErrorPayloadTooLarge.httpCode);
	});

	test('should list children', async () => {
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

	test('should associate a resource blob with a share', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);

		const { share } = await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', [
			{
				id: '000000000000000000000000000000F1',
				children: [],
			},
		]);

		await putApi(session1.id, 'items/root:/.resource/000000000000000000000000000000E1:/content', {}, { query: { share_id: share.id } });

		const item = await models().item().loadByName(user1.id, resourceBlobPath('000000000000000000000000000000E1'));
		expect(item.jop_share_id).toBe(share.id);
	});

	test('should not upload or download items if the account is disabled', async () => {
		const { session, user } = await createUserAndSession(1);

		// Should work
		await createItem(session.id, 'root:/test1.txt:', 'test1');
		expect(await getItem(session.id, 'root:/test1.txt:')).toBe('test1');

		// Should no longer work
		await models().user().save({ id: user.id, enabled: 0 });
		await expectHttpError(async () => createItem(session.id, 'root:/test2.txt:', 'test2'), ErrorForbidden.httpCode);
		await expectHttpError(async () => getItem(session.id, 'root:/test1.txt:'), ErrorForbidden.httpCode);
	});

	test('should check permissions - only share participants can associate an item with a share', async () => {
		const { session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);
		const { session: session3 } = await createUserAndSession(3);

		const { share } = await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', [
			{
				id: '000000000000000000000000000000F1',
				children: [],
			},
		]);

		await expectHttpError(
			async () => putApi(session3.id, 'items/root:/.resource/000000000000000000000000000000E1:/content', {}, { query: { share_id: share.id } }),
			ErrorForbidden.httpCode
		);
	});

	test('should check permissions - uploaded item should be below the allowed limit', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);

		{
			await models().user().save({ id: user1.id, max_item_size: 4 });

			await expectHttpError(
				async () => createNote(session1.id, {
					id: '00000000000000000000000000000001',
					body: '12345',
				}),
				ErrorPayloadTooLarge.httpCode);
		}

		{
			await models().user().save({ id: user1.id, max_item_size: 1000 });

			await expectNoHttpError(
				async () => createNote(session1.id, {
					id: '00000000000000000000000000000002',
					body: '12345',
				})
			);
		}

		{
			await models().user().save({ id: user1.id, max_item_size: 0 });

			await expectNoHttpError(
				async () => createNote(session1.id, {
					id: '00000000000000000000000000000003',
					body: '12345',
				})
			);
		}
	});

	test('should check permissions - uploaded item should not make the account go over the allowed max limit', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);

		{
			await models().user().save({ id: user1.id, max_total_item_size: 4 });

			await expectHttpError(
				async () => createNote(session1.id, {
					id: '00000000000000000000000000000001',
					body: '12345',
				}),
				ErrorPayloadTooLarge.httpCode
			);
		}

		{
			await models().user().save({ id: user1.id, max_total_item_size: 1000 });

			await expectNoHttpError(
				async () => createNote(session1.id, {
					id: '00000000000000000000000000000002',
					body: '12345',
				})
			);
		}

		{
			await models().user().save({ id: user1.id, max_total_item_size: 0 });

			await expectNoHttpError(
				async () => createNote(session1.id, {
					id: '00000000000000000000000000000003',
					body: '12345',
				})
			);
		}
	});

	test('should check permissions - should not allow uploading items if disabled', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);

		await models().user().save({ id: user1.id, can_upload: 0 });

		await expectHttpError(
			async () => createNote(session1.id, {
				id: '00000000000000000000000000000001',
				body: '12345',
			}),
			ErrorForbidden.httpCode
		);
	});

});
