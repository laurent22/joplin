import { ChangeType, Share, ShareType, ShareUser } from '../../db';
import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession, models, checkThrowAsync, createNote, createFolder, updateItem, createItemTree, makeNoteSerializedBody, createItem, initGlobalLogger } from '../../utils/testing/testUtils';
import { postApi, patchApi, getApi } from '../../utils/testing/apiUtils';
import { PaginatedChanges } from '../../models/ChangeModel';
import { shareWithUserAndAccept } from '../../utils/testing/shareApiUtils';
import { msleep } from '../../utils/time';
import { ErrorBadRequest } from '../../utils/errors';
import { serializeJoplinItem, unserializeJoplinItem } from '../../apps/joplin/joplinUtils';
import { PaginatedItems } from '../../models/ItemModel';
import { NoteEntity } from '@joplin/lib/services/database/types';

describe('api_shares', function() {

	beforeAll(async () => {
		await beforeAllDb('api_shares');
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
		expect(shareUser.is_accepted).toBe(0);

		// ----------------------------------------------------------------
		// On the sharee side, accept the share
		// ----------------------------------------------------------------
		await patchApi<ShareUser>(session2.id, `share_users/${shareUser.id}`, { is_accepted: 1 });

		{
			shareUser = await models().shareUser().load(shareUser.id);
			expect(shareUser.is_accepted).toBe(1);
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

		const itemModel = models().item({ userId: user1.id });

		await createItemTree(itemModel, '', tree);

		const folderItem = await itemModel.loadByJopId('000000000000000000000000000000F3');

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

	test('should share when a note that is added to a shared folder', async function() {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		const tree: any = {
			'000000000000000000000000000000F2': {
				'00000000000000000000000000000001': null,
			},
		};

		const itemModel = models().item({ userId: user1.id });

		await createItemTree(itemModel, '', tree);

		const folderItem = await itemModel.loadByJopId('000000000000000000000000000000F2');
		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem);

		await createNote(session1.id, {
			id: '00000000000000000000000000000002',
			parent_id: '000000000000000000000000000000F2',
		});

		await models().share().updateSharedItems();

		const newChildren = await models().item({ userId: user2.id }).children();
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

		const itemModel = models().item({ userId: user1.id });

		await createItemTree(itemModel, '', tree);

		const folderItem1 = await itemModel.loadByJopId('000000000000000000000000000000F1');
		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem1);

		const folderItem5 = await itemModel.loadByJopId('000000000000000000000000000000F5');
		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem5);

		await models().share().updateSharedItems();

		const noteItem = await itemModel.loadByJopId('00000000000000000000000000000001');

		// Note is moved to another folder, but still within shared folder

		{
			await itemModel.save({
				id: noteItem.id,
				jop_parent_id: '000000000000000000000000000000F2',
			});

			await models().share().updateSharedItems();

			const newChildren = await models().item({ userId: user2.id }).children();
			expect(newChildren.items.length).toBe(4);
		}

		// Note is moved to another folder, outside of shared folder

		{
			await itemModel.save({
				id: noteItem.id,
				jop_parent_id: '000000000000000000000000000000F3',
			});

			await models().share().updateSharedItems();

			const newChildren = await models().item({ userId: user2.id }).children();
			expect(newChildren.items.length).toBe(3);
			expect(newChildren.items.find(i => i.name === '00000000000000000000000000000001.md')).toBe(undefined);
		}

		// Note is moved from a non-shared folder to another non-shared folder

		{
			await itemModel.save({
				id: noteItem.id,
				jop_parent_id: '000000000000000000000000000000F4',
			});

			await models().share().updateSharedItems();

			const newChildren = await models().item({ userId: user2.id }).children();
			expect(newChildren.items.length).toBe(3);
			expect(newChildren.items.find(i => i.name === '00000000000000000000000000000001.md')).toBe(undefined);
		}

		// Note is moved from a non-shared folder, back to a shared folder

		{
			await itemModel.save({
				id: noteItem.id,
				jop_parent_id: '000000000000000000000000000000F1',
			});

			await models().share().updateSharedItems();

			const newChildren = await models().item({ userId: user2.id }).children();
			expect(newChildren.items.length).toBe(4);
			expect(!!newChildren.items.find(i => i.name === '00000000000000000000000000000001.md')).toBe(true);
		}

		// Note is moved from a shared folder to a different shared folder

		{
			await itemModel.save({
				id: noteItem.id,
				jop_parent_id: '000000000000000000000000000000F5',
			});

			await models().share().updateSharedItems();

			const newChildren = await models().item({ userId: user2.id }).children();
			expect(newChildren.items.length).toBe(4);
			expect(!!newChildren.items.find(i => i.name === '00000000000000000000000000000001.md')).toBe(true);
		}
	});

	test('should unshare a deleted item', async function() {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		const tree: any = {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		};

		const itemModel = models().item({ userId: user1.id });

		await createItemTree(itemModel, '', tree);

		const folderItem = await itemModel.loadByJopId('000000000000000000000000000000F1');

		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem);

		const itemModel2 = models().item({ userId: user2.id });
		expect((await itemModel2.children()).items.length).toBe(2);

		const noteModel = await itemModel.loadByJopId('00000000000000000000000000000001');

		await itemModel.delete(noteModel.id);

		expect((await itemModel2.children()).items.length).toBe(1);
	});

	test('should unshare a deleted shared root folder', async function() {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		const tree: any = {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		};

		const itemModel = models().item({ userId: user1.id });

		await createItemTree(itemModel, '', tree);

		const folderItem = await itemModel.loadByJopId('000000000000000000000000000000F1');

		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem);

		await itemModel.delete(folderItem.id);

		// Once the root folder has been deleted, it is unshared, so the
		// recipient user should no longer see any item
		const itemModel2 = models().item({ userId: user2.id });
		expect((await itemModel2.children()).items.length).toBe(0);

		// Even though the root folder has been deleted, its children have not
		// been (they are deleted by the client), so the owner should still see
		// one child.
		expect((await itemModel.children()).items.length).toBe(1);

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

		const itemModel1 = models().item({ userId: user1.id });
		const itemModel2 = models().item({ userId: user2.id });

		await createItemTree(itemModel1, '', tree);

		const folderItem = await itemModel1.loadByJopId('000000000000000000000000000000F1');

		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem);

		expect((await itemModel2.children()).items.length).toBe(2);

		const share = (await models().share({ userId: user1.id }).all())[0];
		await models().share({ userId: user1.id }).delete(share.id);

		expect((await itemModel1.children()).items.length).toBe(2);
		expect((await itemModel2.children()).items.length).toBe(0);
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

		const itemModel1 = models().item({ userId: user1.id });

		await createItemTree(itemModel1, '', tree);
		const folderItem = await itemModel1.loadByJopId('000000000000000000000000000000F1');
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

		const noteItem = await itemModel1.loadByJopId('00000000000000000000000000000001');
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

});
