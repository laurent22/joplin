import { ChangeType, Share, ShareType, ShareUser, ShareUserStatus } from '../../db';
import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession, models, checkThrowAsync, createNote, createFolder, updateItem, createItemTree, makeNoteSerializedBody, createItem, updateNote, expectHttpError, createResource, createItemTree2 } from '../../utils/testing/testUtils';
import { postApi, patchApi, getApi, deleteApi } from '../../utils/testing/apiUtils';
import { PaginatedChanges } from '../../models/ChangeModel';
import { shareWithUserAndAccept } from '../../utils/testing/shareApiUtils';
import { msleep } from '../../utils/time';
import { ErrorBadRequest, ErrorForbidden } from '../../utils/errors';
import { serializeJoplinItem, unserializeJoplinItem } from '../../apps/joplin/joplinUtils';
import { PaginatedItems } from '../../models/ItemModel';
import { NoteEntity } from '@joplin/lib/services/database/types';

describe('shares.folder', function() {

	beforeAll(async () => {
		await beforeAllDb('shares.folder');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should share a folder with another user', async function() {
		const { session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);
		const folderItem = await createFolder(session1.id, { title: 'created by sharer' });

		// ----------------------------------------------------------------
		// Create the file share object
		// ----------------------------------------------------------------
		const share = await postApi<Share>(session1.id, 'shares', {
			type: ShareType.JoplinRootFolder,
			folder_id: folderItem.jop_id,
		});

		// ----------------------------------------------------------------
		// Send the share to a user
		// ----------------------------------------------------------------
		let shareUser = await postApi(session1.id, `shares/${share.id}/users`, {
			email: user2.email,
		}) as ShareUser;

		shareUser = await models().shareUser().load(shareUser.id);
		expect(shareUser.share_id).toBe(share.id);
		expect(shareUser.user_id).toBe(user2.id);
		expect(shareUser.status).toBe(ShareUserStatus.Waiting);

		// ----------------------------------------------------------------
		// On the sharee side, accept the share
		// ----------------------------------------------------------------
		await patchApi<ShareUser>(session2.id, `share_users/${shareUser.id}`, { status: ShareUserStatus.Accepted });

		{
			shareUser = await models().shareUser().load(shareUser.id);
			expect(shareUser.status).toBe(ShareUserStatus.Accepted);
		}

		// ----------------------------------------------------------------
		// On the sharee side, check that the file is present
		// and with the right content.
		// ----------------------------------------------------------------
		const results = await getApi<PaginatedItems>(session2.id, 'items/root/children');
		expect(results.items.length).toBe(1);
		expect(results.items[0].name).toBe(folderItem.name);

		const itemContent = await getApi<Buffer>(session2.id, `items/root:/${folderItem.name}:/content`);
		expect(itemContent.toString().includes('created by sharer')).toBe(true);

		// ----------------------------------------------------------------
		// If file is changed by sharee, sharer should see the change too
		// ----------------------------------------------------------------
		{
			const folder = await unserializeJoplinItem(itemContent.toString());
			folder.title = 'modified by recipient';
			await updateItem(session2.id, `root:/${folderItem.name}:`, await serializeJoplinItem(folder));

			// Double check that it didn't create a new item instead of updating it
			expect((await models().item().all()).length).toBe(1);

			const modContent = await getApi<Buffer>(session1.id, `items/root:/${folderItem.name}:/content`);
			expect(modContent.toString().includes('modified by recipient')).toBe(true);
		}
	});

	test('should share a folder and all its children', async function() {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		const tree: any = {
			'000000000000000000000000000000F1': {},
			'000000000000000000000000000000F2': {
				'00000000000000000000000000000001': null,
				'00000000000000000000000000000002': null,
			},
			'000000000000000000000000000000F3': {
				'00000000000000000000000000000003': null,
				'000000000000000000000000000000F4': {
					'00000000000000000000000000000004': null,
					'00000000000000000000000000000005': null,
				},
			},
			'00000000000000000000000000000006': null,
			'00000000000000000000000000000007': null,
		};

		const itemModel = models().item();

		await createItemTree(user1.id, '', tree);

		const folderItem = await itemModel.loadByJopId(user1.id, '000000000000000000000000000000F3');

		const childrenBefore = await getApi<PaginatedItems>(session2.id, 'items/root/children');
		expect(childrenBefore.items.length).toBe(0);

		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem);
		const childrenAfter = await getApi<PaginatedItems>(session2.id, 'items/root/children');
		expect(childrenAfter.items.length).toBe(5);

		const expectedNames = [
			'000000000000000000000000000000F3.md',
			'00000000000000000000000000000003.md',
			'000000000000000000000000000000F4.md',
			'00000000000000000000000000000004.md',
			'00000000000000000000000000000005.md',
		];

		expect(childrenAfter.items.map(i => i.name).sort().join(',')).toBe(expectedNames.sort().join(','));
	});

	test('should share when a note is added to a shared folder', async function() {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		const tree: any = {
			'000000000000000000000000000000F2': {
				'00000000000000000000000000000001': null,
			},
		};

		const itemModel = models().item();

		await createItemTree(user1.id, '', tree);

		const folderItem = await itemModel.loadByJopId(user1.id, '000000000000000000000000000000F2');
		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem);

		await createNote(session1.id, {
			id: '00000000000000000000000000000002',
			parent_id: '000000000000000000000000000000F2',
		});

		await models().share().updateSharedItems();

		const newChildren = await models().item().children(user2.id);
		expect(newChildren.items.length).toBe(3);
		expect(!!newChildren.items.find(i => i.name === '00000000000000000000000000000002.md')).toBe(true);
	});

	test('should update share status when note parent changes', async function() {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		const tree: any = {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
				'000000000000000000000000000000F2': {},
			},
			'000000000000000000000000000000F3': {},
			'000000000000000000000000000000F4': {},
			'000000000000000000000000000000F5': {},
		};

		const itemModel = models().item();

		await createItemTree(user1.id, '', tree);

		const folderItem1 = await itemModel.loadByJopId(user1.id, '000000000000000000000000000000F1');
		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem1);

		const folderItem5 = await itemModel.loadByJopId(user1.id, '000000000000000000000000000000F5');
		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem5);

		await models().share().updateSharedItems();

		const noteItem = await itemModel.loadByJopId(user1.id, '00000000000000000000000000000001');

		// Note is moved to another folder, but still within shared folder

		{
			await itemModel.saveForUser(user1.id, {
				id: noteItem.id,
				jop_parent_id: '000000000000000000000000000000F2',
			});

			await models().share().updateSharedItems();

			const newChildren = await models().item().children(user2.id);
			expect(newChildren.items.length).toBe(4);
		}

		// Note is moved to another folder, outside of shared folder

		{
			await itemModel.saveForUser(user1.id, {
				id: noteItem.id,
				jop_parent_id: '000000000000000000000000000000F3',
			});

			await models().share().updateSharedItems();

			const newChildren = await models().item().children(user2.id);
			expect(newChildren.items.length).toBe(3);
			expect(newChildren.items.find(i => i.name === '00000000000000000000000000000001.md')).toBe(undefined);
		}

		// Note is moved from a non-shared folder to another non-shared folder

		{
			await itemModel.saveForUser(user1.id, {
				id: noteItem.id,
				jop_parent_id: '000000000000000000000000000000F4',
			});

			await models().share().updateSharedItems();

			const newChildren = await models().item().children(user2.id);
			expect(newChildren.items.length).toBe(3);
			expect(newChildren.items.find(i => i.name === '00000000000000000000000000000001.md')).toBe(undefined);
		}

		// Note is moved from a non-shared folder, back to a shared folder

		{
			await itemModel.saveForUser(user1.id, {
				id: noteItem.id,
				jop_parent_id: '000000000000000000000000000000F1',
			});

			await models().share().updateSharedItems();

			const newChildren = await models().item().children(user2.id);
			expect(newChildren.items.length).toBe(4);
			expect(!!newChildren.items.find(i => i.name === '00000000000000000000000000000001.md')).toBe(true);
		}

		// Note is moved from a shared folder to a different shared folder

		{
			await itemModel.saveForUser(user1.id, {
				id: noteItem.id,
				jop_parent_id: '000000000000000000000000000000F5',
			});

			await models().share().updateSharedItems();

			const newChildren = await models().item().children(user2.id);
			expect(newChildren.items.length).toBe(4);
			expect(!!newChildren.items.find(i => i.name === '00000000000000000000000000000001.md')).toBe(true);
		}
	});

	test('should update share status when note parent changes more than once between updates', async function() {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		const tree: any = {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
			'000000000000000000000000000000F2': {},
			'000000000000000000000000000000F3': {},
		};

		const itemModel = models().item();

		await createItemTree(user1.id, '', tree);

		const folderItem1 = await itemModel.loadByJopId(user1.id, '000000000000000000000000000000F1');
		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem1);
		await models().share().updateSharedItems();

		const noteItem = await itemModel.loadByJopId(user1.id, '00000000000000000000000000000001');

		// Note is changed twice, but the parent ID doesn't change

		await itemModel.saveForUser(user1.id, {
			id: noteItem.id,
			jop_parent_id: '000000000000000000000000000000F2',
		});

		await itemModel.saveForUser(user1.id, {
			id: noteItem.id,
			jop_parent_id: '000000000000000000000000000000F2',
		});

		await models().share().updateSharedItems();

		const newChildren = await models().item().children(user2.id);
		expect(newChildren.items.length).toBe(1);
		expect(newChildren.items[0].id).toBe(folderItem1.id);
	});

	test('should unshare a deleted item', async function() {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		const tree: any = {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		};

		const itemModel = models().item();

		await createItemTree(user1.id, '', tree);

		const folderItem = await itemModel.loadByJopId(user1.id, '000000000000000000000000000000F1');

		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem);

		const itemModel2 = models().item();
		expect((await itemModel2.children(user2.id)).items.length).toBe(2);

		const noteModel = await itemModel.loadByJopId(user1.id, '00000000000000000000000000000001');

		await itemModel.delete(noteModel.id);

		expect((await itemModel2.children(user2.id)).items.length).toBe(1);
	});

	test('should unshare a deleted shared root folder', async function() {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		const tree: any = {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		};

		const itemModel = models().item();

		await createItemTree(user1.id, '', tree);

		const folderItem = await itemModel.loadByJopId(user1.id, '000000000000000000000000000000F1');

		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem);

		await itemModel.delete(folderItem.id);

		// Once the root folder has been deleted, it is unshared, so the
		// recipient user should no longer see any item
		const itemModel2 = models().item();
		expect((await itemModel2.children(user2.id)).items.length).toBe(0);

		// Even though the root folder has been deleted, its children have not
		// been (they are deleted by the client), so the owner should still see
		// one child.
		expect((await itemModel.children(user1.id)).items.length).toBe(1);

		// Also check that Share and UserShare objects are deleted
		expect((await models().share().all()).length).toBe(0);
		expect((await models().shareUser().all()).length).toBe(0);

		// Test deleting the share, but not the root folder
	});

	test('should unshare when the share object is deleted', async function() {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		const tree: any = {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		};

		const itemModel1 = models().item();
		const itemModel2 = models().item();

		await createItemTree(user1.id, '', tree);

		const folderItem = await itemModel1.loadByJopId(user1.id, '000000000000000000000000000000F1');

		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem);

		expect((await itemModel2.children(user2.id)).items.length).toBe(2);

		const share = (await models().share().all())[0];
		await models().share().delete(share.id);

		expect((await itemModel1.children(user1.id)).items.length).toBe(2);
		expect((await itemModel2.children(user2.id)).items.length).toBe(0);
	});

	test('should associate a user with the item after sharing', async function() {
		const { session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		const item = await createItem(session1.id, 'root:/test.txt:', 'testing');

		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.App, item);

		expect((await models().userItem().all()).length).toBe(2);
		expect(!!(await models().userItem().all()).find(ui => ui.user_id === user2.id)).toBe(true);
	});

	test('should not share an already shared item', async function() {
		const { session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);
		const { user: user3, session: session3 } = await createUserAndSession(3);

		const item = await createItem(session1.id, 'root:/test.txt:', 'testing');

		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.App, item);
		const error = await checkThrowAsync(async () => shareWithUserAndAccept(session2.id, session3.id, user3, ShareType.App, item));
		expect(error.httpCode).toBe(ErrorBadRequest.httpCode);
	});

	test('should see delta changes for linked items', async function() {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		const tree: any = {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		};

		const itemModel1 = models().item();

		await createItemTree(user1.id, '', tree);
		const folderItem = await itemModel1.loadByJopId(user1.id, '000000000000000000000000000000F1');
		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem);

		let cursor1: string = null;
		let cursor2: string = null;

		{
			const names = ['000000000000000000000000000000F1.md', '00000000000000000000000000000001.md'].sort();

			const page1 = await getApi<PaginatedChanges>(session1.id, 'items/root/delta');
			expect(page1.items.map(i => i.item_name).sort()).toEqual(names);
			cursor1 = page1.cursor;

			const page2 = await getApi<PaginatedChanges>(session2.id, 'items/root/delta');
			expect(page2.items.map(i => i.item_name).sort()).toEqual(names);
			cursor2 = page2.cursor;
		}

		// --------------------------------------------------------------------
		// If item is changed on sharer side, sharee should see the changes
		// --------------------------------------------------------------------

		const noteItem = await itemModel1.loadByJopId(user1.id, '00000000000000000000000000000001');
		const note: NoteEntity = await itemModel1.loadAsJoplinItem(noteItem.id);
		await msleep(1);
		await updateItem(session1.id, 'root:/00000000000000000000000000000001.md:', makeNoteSerializedBody({
			...note,
			title: 'modified by user 1',
		}));

		{
			const page1 = await getApi<PaginatedChanges>(session1.id, 'items/root/delta', { query: { cursor: cursor1 } });
			expect(page1.items.length).toBe(1);
			expect(page1.items[0].item_name).toBe('00000000000000000000000000000001.md');
			expect(page1.items[0].type).toBe(ChangeType.Update);
			cursor1 = page1.cursor;

			const page2 = await getApi<PaginatedChanges>(session2.id, 'items/root/delta', { query: { cursor: cursor2 } });
			expect(page2.items.length).toBe(1);
			expect(page2.items[0].item_name).toBe('00000000000000000000000000000001.md');
			expect(page2.items[0].type).toBe(ChangeType.Update);
			expect(page2.items[0].updated_time).toBe(page1.items[0].updated_time);
			cursor2 = page2.cursor;
		}

		// --------------------------------------------------------------------
		// If item is changed on sharee side, sharer should see the changes
		// --------------------------------------------------------------------

		await msleep(1);
		await updateItem(session2.id, 'root:/00000000000000000000000000000001.md:', makeNoteSerializedBody({
			...note,
			title: 'modified by user 2',
		}));

		{
			const page1 = await getApi<PaginatedChanges>(session1.id, 'items/root/delta', { query: { cursor: cursor1 } });
			expect(page1.items.length).toBe(1);
			expect(page1.items[0].item_name).toBe('00000000000000000000000000000001.md');
			expect(page1.items[0].type).toBe(ChangeType.Update);
			cursor1 = page1.cursor;

			const page2 = await getApi<PaginatedChanges>(session2.id, 'items/root/delta', { query: { cursor: cursor2 } });
			expect(page2.items.length).toBe(1);
			expect(page2.items[0].item_name).toBe('00000000000000000000000000000001.md');
			expect(page2.items[0].type).toBe(ChangeType.Update);
			cursor2 = page2.cursor;
		}
	});

	test('should get delta changes - user 2 sync, user 1 share and sync, user 2 sync', async function() {
		// - User 1 sync
		// - User 2 sync - and keep delta2
		// - User 1 share a folder with user 2
		// - User 2 accepts
		// - User 2 sync from delta2
		// => Should get shared folder and its content

		// When fetching changes - should add all user_items that have been created since delta2
		// And emit Create event for associated item ID

		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		await createItemTree(user1.id, '', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		});

		await createItemTree(user2.id, '', {
			'200000000000000000000000000000F2': {},
		});

		let latestChanges2 = await models().change().allForUser(user2.id);
		const cursor2 = latestChanges2.cursor;

		const folderItem1 = await models().item().loadByJopId(user1.id, '000000000000000000000000000000F1');
		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem1);
		await models().share().updateSharedItems();

		latestChanges2 = await models().change().allForUser(user2.id, { cursor: cursor2 });
		expect(latestChanges2.items.length).toBe(2);
	});

	test('should get delta changes - user 1 and 2 are in sync, user 2 adds a note to shared folder', async function() {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		await createItemTree(user1.id, '', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		});

		let latestChanges1 = await models().change().allForUser(user1.id);
		const cursor1 = latestChanges1.cursor;

		const folderItem1 = await models().item().loadByJopId(user1.id, '000000000000000000000000000000F1');
		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem1);
		await models().share().updateSharedItems();

		await createNote(session2.id, { id: '00000000000000000000000000000002', title: 'from user 2', parent_id: folderItem1.jop_id });
		await models().share().updateSharedItems();

		latestChanges1 = await models().change().allForUser(user1.id, { cursor: cursor1 });
		expect(latestChanges1.items.length).toBe(1);
		expect(latestChanges1.items[0].item_name).toBe('00000000000000000000000000000002.md');
	});

	test('should get delta changes - user 1 and 2 are in sync, user 2 moves a note out of shared folder', async function() {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		await createItemTree(user1.id, '', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		});

		let latestChanges1 = await models().change().allForUser(user1.id);
		const cursor1 = latestChanges1.cursor;

		const folderItem1 = await models().item().loadByJopId(user1.id, '000000000000000000000000000000F1');
		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem1);
		await models().share().updateSharedItems();

		const folderItem2 = await createFolder(session2.id, { id: '000000000000000000000000000000F2', title: 'folder2' });
		const noteItem = await models().item().loadByJopId(user1.id, '00000000000000000000000000000001');
		const note: NoteEntity = await models().item().loadAsJoplinItem(noteItem.id);

		await updateNote(session2.id, { ...note, parent_id: folderItem2.jop_id });
		await models().share().updateSharedItems();

		latestChanges1 = await models().change().allForUser(user1.id, { cursor: cursor1 });
		expect(latestChanges1.items.length).toBe(1);
		expect(latestChanges1.items[0].type).toBe(ChangeType.Delete);
		expect(latestChanges1.items[0].item_id).toBe(noteItem.id);
	});

	test('should get delta changes - user 1 and 2 are in sync, user 1 deletes invitation', async function() {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		const resourceItem1 = await createResource(session1.id, { id: '000000000000000000000000000000E1' }, 'testing1');

		await createItemTree2(user1.id, '', [
			{
				id: '000000000000000000000000000000F1',
				children: [
					{
						id: '00000000000000000000000000000001',
						title: 'note test',
						body: `[testing](:/${resourceItem1.jop_id})`,
					},
				],
			},
		]);

		const folderItem1 = await models().item().loadByJopId(user1.id, '000000000000000000000000000000F1');
		const { shareUser } = await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem1);
		await models().share().updateSharedItems();

		expect((await models().userItem().byUserId(user2.id)).length).toBe(4);
		await deleteApi(session1.id, `share_users/${shareUser.id}`);
		expect((await models().userItem().byUserId(user2.id)).length).toBe(0);
	});

	test('should check permissions - cannot share a folder with yourself', async function() {
		const { user: user1, session: session1 } = await createUserAndSession(1);

		await createItemTree(user1.id, '', { '000000000000000000000000000000F1': {} });
		const share = await postApi<Share>(session1.id, 'shares', { folder_id: '000000000000000000000000000000F1' });
		await expectHttpError(async () => postApi(session1.id, `shares/${share.id}/users`, { email: user1.email }), ErrorForbidden.httpCode);
	});

	test('should check permissions - cannot share a folder twice with a user', async function() {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2 } = await createUserAndSession(2);

		await createItemTree(user1.id, '', { '000000000000000000000000000000F1': {} });
		const share = await postApi<Share>(session1.id, 'shares', { folder_id: '000000000000000000000000000000F1' });
		await postApi(session1.id, `shares/${share.id}/users`, { email: user2.email });
		await expectHttpError(async () => postApi(session1.id, `shares/${share.id}/users`, { email: user2.email }), ErrorForbidden.httpCode);
	});

	test('should check permissions - cannot share a non-root folder', async function() {
		const { user: user1, session: session1 } = await createUserAndSession(1);

		await createItemTree(user1.id, '', {
			'000000000000000000000000000000F1': {
				'000000000000000000000000000000F2': {},
			},
		});

		await expectHttpError(async () => postApi<Share>(session1.id, 'shares', { folder_id: '000000000000000000000000000000F2' }), ErrorForbidden.httpCode);
	});

	test('should check permissions - only owner of share can deleted associated folder', async function() {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		await createItemTree(user1.id, '', { '000000000000000000000000000000F1': {}	});
		const folderItem1 = await models().item().loadByJopId(user1.id, '000000000000000000000000000000F1');
		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem1);
		await expectHttpError(async () => deleteApi(session2.id, 'items/000000000000000000000000000000F1.md'), ErrorForbidden.httpCode);
	});

});
