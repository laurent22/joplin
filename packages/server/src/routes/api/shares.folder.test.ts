import { ChangeType, Share, ShareType, ShareUser, ShareUserStatus } from '../../services/database/types';
import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession, models, createNote, createFolder, updateItem, createItemTree, makeNoteSerializedBody, updateNote, expectHttpError, createResource, expectNotThrow } from '../../utils/testing/testUtils';
import { postApi, patchApi, getApi, deleteApi } from '../../utils/testing/apiUtils';
import { PaginatedDeltaChanges } from '../../models/ChangeModel';
import { inviteUserToShare, shareFolderWithUser } from '../../utils/testing/shareApiUtils';
import { msleep } from '../../utils/time';
import { ErrorForbidden } from '../../utils/errors';
import { resourceBlobPath, serializeJoplinItem, unserializeJoplinItem } from '../../utils/joplinUtils';
import { PaginatedItems } from '../../models/ItemModel';
import { NoteEntity } from '@joplin/lib/services/database/types';

describe('shares.folder', () => {

	beforeAll(async () => {
		await beforeAllDb('shares.folder');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should share a folder with another user', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);
		const folderItem = await createFolder(session1.id, { title: 'created by sharer' });

		// ----------------------------------------------------------------
		// Create the file share object
		// ----------------------------------------------------------------
		const share = await postApi<Share>(session1.id, 'shares', {
			type: ShareType.Folder,
			folder_id: folderItem.jop_id,
		});

		// ----------------------------------------------------------------
		// Once the share object has been created, the client can add folders
		// and notes to it. This is done by setting the share_id property,
		// which we simulate here.
		// ----------------------------------------------------------------
		await models().item().saveForUser(user1.id, {
			id: folderItem.id,
			jop_share_id: share.id,
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

		await models().share().updateSharedItems3();

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

	test('should share a folder and all its children', async () => {
		const { session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);

		await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F3', [
			{
				id: '000000000000000000000000000000F1',
				children: [],
			},
			{
				id: '000000000000000000000000000000F2',
				children: [
					{
						id: '00000000000000000000000000000001',
					},
				],
			},
			{
				id: '000000000000000000000000000000F3',
				children: [
					{
						id: '00000000000000000000000000000003',
					},
					{
						id: '000000000000000000000000000000F4',
						children: [
							{
								id: '00000000000000000000000000000004',
							},
							{
								id: '00000000000000000000000000000005',
							},
						],
					},
				],
			},
		]);

		const children1 = await getApi<PaginatedItems>(session1.id, 'items/root/children');
		expect(children1.items.length).toBe(8);

		const children2 = await getApi<PaginatedItems>(session2.id, 'items/root/children');
		expect(children2.items.length).toBe(5);

		const expectedNames = [
			'000000000000000000000000000000F3.md',
			'00000000000000000000000000000003.md',
			'000000000000000000000000000000F4.md',
			'00000000000000000000000000000004.md',
			'00000000000000000000000000000005.md',
		];

		expect(children2.items.map(i => i.name).sort().join(',')).toBe(expectedNames.sort().join(','));
	});

	test('should received shared items only once invitation accepted', async () => {
		const { session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);

		const { shareUser } = await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', [
			{
				id: '000000000000000000000000000000F1',
				children: [
					{
						id: '00000000000000000000000000000001',
					},
				],
			},
		], false);

		// The invitation has not been accepted yet, so user 2 should not see any item

		{
			const children2 = await getApi<PaginatedItems>(session2.id, 'items/root/children');
			expect(children2.items.length).toBe(0);
		}

		await patchApi(session2.id, `share_users/${shareUser.id}`, { status: ShareUserStatus.Accepted });

		// As soon as the invitation is accepted, all items should be available,
		// without having to wait for the share service.

		{
			const children2 = await getApi<PaginatedItems>(session2.id, 'items/root/children');
			expect(children2.items.length).toBe(2);
		}
	});

	test('should share when a note is added to a shared folder', async () => {
		const { session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		const { share } = await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F2', [
			{
				id: '000000000000000000000000000000F2',
				children: [
					{
						id: '00000000000000000000000000000001',
					},
				],
			},
		]);

		await createNote(session1.id, {
			id: '00000000000000000000000000000002',
			parent_id: '000000000000000000000000000000F2',
			share_id: share.id,
		});

		await models().share().updateSharedItems3();

		const newChildren = await models().item().children(user2.id);
		expect(newChildren.items.length).toBe(3);
		expect(!!newChildren.items.find(i => i.name === '00000000000000000000000000000002.md')).toBe(true);
	});

	test('should update share status when note parent changes', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		const { share: share1 } = await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', [
			{
				id: '000000000000000000000000000000F1',
				children: [
					{
						id: '00000000000000000000000000000001',
					},
					{
						id: '000000000000000000000000000000F2',
						children: [],
					},
				],
			},
		]);

		const { share: share2 } = await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F5', [
			{
				id: '000000000000000000000000000000F3',
				children: [],
			},
			{
				id: '000000000000000000000000000000F4',
				children: [],
			},
			{
				id: '000000000000000000000000000000F5',
				children: [],
			},
		]);

		const noteItem = await models().item().loadByJopId(user1.id, '00000000000000000000000000000001');

		// Note is moved to another folder, but still within shared folder

		{
			await models().item().saveForUser(user1.id, {
				id: noteItem.id,
				jop_parent_id: '000000000000000000000000000000F2',
				jop_share_id: share1.id,
			});

			await models().share().updateSharedItems3();

			const newChildren = await models().item().children(user2.id);
			expect(newChildren.items.length).toBe(4);
		}

		// Note is moved to another folder, outside to a non-shared folder

		{
			await models().item().saveForUser(user1.id, {
				id: noteItem.id,
				jop_parent_id: '000000000000000000000000000000F3',
				jop_share_id: '',
			});

			await models().share().updateSharedItems3();

			const newChildren = await models().item().children(user2.id);
			expect(newChildren.items.length).toBe(3);
			expect(newChildren.items.find(i => i.name === '00000000000000000000000000000001.md')).toBe(undefined);
		}

		// Note is moved from a non-shared folder to another non-shared folder

		{
			await models().item().saveForUser(user1.id, {
				id: noteItem.id,
				jop_parent_id: '000000000000000000000000000000F4',
				jop_share_id: '',
			});

			await models().share().updateSharedItems3();

			const newChildren = await models().item().children(user2.id);
			expect(newChildren.items.length).toBe(3);
			expect(newChildren.items.find(i => i.name === '00000000000000000000000000000001.md')).toBe(undefined);
		}

		// Note is moved from a non-shared folder, back to a shared folder

		{
			await models().item().saveForUser(user1.id, {
				id: noteItem.id,
				jop_parent_id: '000000000000000000000000000000F1',
				jop_share_id: share1.id,
			});

			await models().share().updateSharedItems3();

			const newChildren = await models().item().children(user2.id);
			expect(newChildren.items.length).toBe(4);
			expect(!!newChildren.items.find(i => i.name === '00000000000000000000000000000001.md')).toBe(true);
		}

		// Note is moved from a shared folder to a different shared folder

		{
			await models().item().saveForUser(user1.id, {
				id: noteItem.id,
				jop_parent_id: '000000000000000000000000000000F5',
				jop_share_id: share2.id,
			});

			await models().share().updateSharedItems3();

			const newChildren = await models().item().children(user2.id);
			expect(newChildren.items.length).toBe(4);
			expect(!!newChildren.items.find(i => i.name === '00000000000000000000000000000001.md')).toBe(true);
		}
	});

	test('should update share status when note parent changes more than once between updates', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
			'000000000000000000000000000000F2': {},
			'000000000000000000000000000000F3': {},
		});

		const folderItem1 = await models().item().loadByJopId(user1.id, '000000000000000000000000000000F1');

		const noteItem = await models().item().loadByJopId(user1.id, '00000000000000000000000000000001');

		// Note is moved to a non-shared folder and changed twice, but the
		// parent ID doesn't change.

		await models().item().saveForUser(user1.id, {
			id: noteItem.id,
			jop_parent_id: '000000000000000000000000000000F2',
			jop_share_id: '',
		});

		await models().item().saveForUser(user1.id, {
			id: noteItem.id,
			jop_parent_id: '000000000000000000000000000000F2',
			jop_share_id: '',
		});

		await models().share().updateSharedItems3();

		const newChildren = await models().item().children(user2.id);
		expect(newChildren.items.length).toBe(1);
		expect(newChildren.items[0].id).toBe(folderItem1.id);
	});

	test('should not throw an error if an item is associated with a share that no longer exists', async () => {
		const { session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);

		const { share } = await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', {
			'000000000000000000000000000000F1': {},
		});

		await createNote(session1.id, {
			id: '00000000000000000000000000000007',
			share_id: share.id,
		});

		await models().share().delete(share.id);

		await expectNotThrow(async () => await models().share().updateSharedItems3());
	});

	test('should not throw an error if a change is associated with an item that no longer exists', async () => {
		const { session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);

		const { share: share1 } = await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', {
			'000000000000000000000000000000F1': {},
		});

		const { share: share2 } = await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F2', {
			'000000000000000000000000000000F2': {},
		});

		const item1 = await createNote(session1.id, {
			id: '00000000000000000000000000000007',
			share_id: share1.id,
		});

		await createNote(session1.id, {
			id: '00000000000000000000000000000008',
			share_id: share2.id,
		});

		await models().item().delete(item1.id);

		await models().share().updateSharedItems3();

		await expectNotThrow(async () => await models().share().updateSharedItems3());
	});

	test('should not throw an error if a user no longer has a user item, and the target share changes', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', [
			{
				id: '000000000000000000000000000000F1',
				children: [
					{
						id: '00000000000000000000000000000001',
					},
				],
			},
		]);

		const { share: share2 } = await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F5', [
			{
				id: '000000000000000000000000000000F5',
				children: [],
			},
		]);

		const noteItem = await models().item().loadByJopId(user1.id, '00000000000000000000000000000001');

		// Note is moved from a shared folder to a different shared folder

		await models().item().saveForUser(user1.id, {
			id: noteItem.id,
			jop_parent_id: '000000000000000000000000000000F5',
			jop_share_id: share2.id,
		});

		await models().userItem().deleteByUserItem(user2.id, noteItem.id, { recordChanges: false });

		await expectNotThrow(async () => await models().share().updateSharedItems3());
	});

	test('should unshare a deleted item', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		});

		expect((await models().item().children(user2.id)).items.length).toBe(2);

		const noteModel = await models().item().loadByJopId(user1.id, '00000000000000000000000000000001');

		await models().item().delete(noteModel.id);

		expect((await models().item().children(user2.id)).items.length).toBe(1);
	});

	test('should unshare a deleted shared root folder', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		});

		const folderItem = await models().item().loadByJopId(user1.id, '000000000000000000000000000000F1');

		await models().item().delete(folderItem.id);

		// await models().share().updateSharedItems3();

		// Once the root folder has been deleted, it is unshared, so the
		// recipient user should no longer see any item
		expect((await models().item().children(user2.id)).items.length).toBe(0);

		// Even though the root folder has been deleted, its children have not
		// been (they are deleted by the client), so the owner should still see
		// one child.
		expect((await models().item().children(user1.id)).items.length).toBe(1);

		// Also check that Share and UserShare objects are deleted
		expect((await models().share().all()).length).toBe(0);
		expect((await models().shareUser().all()).length).toBe(0);

		// Test deleting the share, but not the root folder
	});

	test('should unshare when the share object is deleted', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		});

		expect((await models().item().children(user2.id)).items.length).toBe(2);

		const share = (await models().share().all())[0];
		await models().share().delete(share.id);

		expect((await models().item().children(user1.id)).items.length).toBe(2);
		expect((await models().item().children(user2.id)).items.length).toBe(0);
	});

	// test('should associate a user with the item after sharing', async function() {
	// 	const { session: session1 } = await createUserAndSession(1);
	// 	const { user: user2, session: session2 } = await createUserAndSession(2);

	// 	const item = await createItem(session1.id, 'root:/test.txt:', 'testing');

	// 	await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.App, item);

	// 	expect((await models().userItem().all()).length).toBe(2);
	// 	expect(!!(await models().userItem().all()).find(ui => ui.user_id === user2.id)).toBe(true);
	// });

	// test('should not share an already shared item', async function() {
	// 	const { session: session1 } = await createUserAndSession(1);
	// 	const { user: user2, session: session2 } = await createUserAndSession(2);
	// 	const { user: user3, session: session3 } = await createUserAndSession(3);

	// 	const item = await createItem(session1.id, 'root:/test.txt:', 'testing');

	// 	await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.App, item);
	// 	const error = await checkThrowAsync(async () => shareWithUserAndAccept(session2.id, session3.id, user3, ShareType.App, item));
	// 	expect(error.httpCode).toBe(ErrorBadRequest.httpCode);
	// });

	test('should see delta changes for linked items', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);

		await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		});

		let cursor1: string = null;
		let cursor2: string = null;

		{
			const names = ['000000000000000000000000000000F1.md', '00000000000000000000000000000001.md'].sort();

			const page1 = await getApi<PaginatedDeltaChanges>(session1.id, 'items/root/delta');
			expect(page1.items.map(i => i.item_name).sort()).toEqual(names);
			cursor1 = page1.cursor;

			const page2 = await getApi<PaginatedDeltaChanges>(session2.id, 'items/root/delta');
			expect(page2.items.map(i => i.item_name).sort()).toEqual(names);
			cursor2 = page2.cursor;
		}

		// --------------------------------------------------------------------
		// If item is changed on sharer side, sharee should see the changes
		// --------------------------------------------------------------------

		const noteItem = await models().item().loadByJopId(user1.id, '00000000000000000000000000000001');
		const note: NoteEntity = await models().item().loadAsJoplinItem(noteItem.id);
		await msleep(1);
		await updateItem(session1.id, 'root:/00000000000000000000000000000001.md:', makeNoteSerializedBody({
			...note,
			title: 'modified by user 1',
		}));

		{
			const page1 = await getApi<PaginatedDeltaChanges>(session1.id, 'items/root/delta', { query: { cursor: cursor1 } });
			expect(page1.items.length).toBe(1);
			expect(page1.items[0].item_name).toBe('00000000000000000000000000000001.md');
			expect(page1.items[0].type).toBe(ChangeType.Update);
			cursor1 = page1.cursor;

			const page2 = await getApi<PaginatedDeltaChanges>(session2.id, 'items/root/delta', { query: { cursor: cursor2 } });
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
			const page1 = await getApi<PaginatedDeltaChanges>(session1.id, 'items/root/delta', { query: { cursor: cursor1 } });
			expect(page1.items.length).toBe(1);
			expect(page1.items[0].item_name).toBe('00000000000000000000000000000001.md');
			expect(page1.items[0].type).toBe(ChangeType.Update);
			cursor1 = page1.cursor;

			const page2 = await getApi<PaginatedDeltaChanges>(session2.id, 'items/root/delta', { query: { cursor: cursor2 } });
			expect(page2.items.length).toBe(1);
			expect(page2.items[0].item_name).toBe('00000000000000000000000000000001.md');
			expect(page2.items[0].type).toBe(ChangeType.Update);
			cursor2 = page2.cursor;
		}
	});

	test('should get delta changes - user 2 sync, user 1 share and sync, user 2 sync', async () => {
		// - User 1 sync
		// - User 2 sync - and keep delta2
		// - User 1 share a folder with user 2
		// - User 2 accepts
		// - User 2 sync from delta2
		// => Should get shared folder and its content

		// When fetching changes - should add all user_items that have been created since delta2
		// And emit Create event for associated item ID

		const { session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		await createItemTree(user2.id, '', {
			'200000000000000000000000000000F2': {},
		});

		let latestChanges2 = await models().change().delta(user2.id);
		const cursor2 = latestChanges2.cursor;

		await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		});

		latestChanges2 = await models().change().delta(user2.id, { cursor: cursor2 });
		expect(latestChanges2.items.length).toBe(2);
	});

	test('should get delta changes - user 1 and 2 are in sync, user 2 adds a note to shared folder', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);

		const { share } = await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		});

		let latestChanges1 = await models().change().delta(user1.id);
		const cursor1 = latestChanges1.cursor;

		const folderItem1 = await models().item().loadByJopId(user1.id, '000000000000000000000000000000F1');

		await createNote(session2.id, {
			id: '00000000000000000000000000000002',
			title: 'from user 2',
			parent_id: folderItem1.jop_id,
			share_id: share.id,
		});

		await models().share().updateSharedItems3();

		latestChanges1 = await models().change().delta(user1.id, { cursor: cursor1 });
		expect(latestChanges1.items.length).toBe(1);
		expect(latestChanges1.items[0].item_name).toBe('00000000000000000000000000000002.md');
	});

	test('should get delta changes - user 1 and 2 are in sync, user 2 moves a note out of shared folder', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);

		await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		});

		let latestChanges1 = await models().change().delta(user1.id);
		const cursor1 = latestChanges1.cursor;

		const folderItem2 = await createFolder(session2.id, { id: '000000000000000000000000000000F2', title: 'folder2' });
		const noteItem = await models().item().loadByJopId(user1.id, '00000000000000000000000000000001');
		const note: NoteEntity = await models().item().loadAsJoplinItem(noteItem.id);

		await updateNote(session2.id, { ...note, parent_id: folderItem2.jop_id, share_id: '' });
		await models().share().updateSharedItems3();

		latestChanges1 = await models().change().delta(user1.id, { cursor: cursor1 });
		expect(latestChanges1.items.length).toBe(1);
		expect(latestChanges1.items[0].type).toBe(ChangeType.Delete);
		expect(latestChanges1.items[0].item_id).toBe(noteItem.id);
	});

	test('should get delta changes - user 1 and 2 are in sync, user 1 deletes invitation', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		const resourceItem1 = await createResource(session1.id, { id: '000000000000000000000000000000E1' }, 'testing1');

		const { shareUser, share } = await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', [
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

		await models().item().saveForUser(user1.id, {
			id: resourceItem1.id,
			jop_share_id: share.id,
		});

		const resourceBlob = await models().item().loadByName(user1.id, resourceBlobPath(resourceItem1.jop_id));

		await models().item().saveForUser(user1.id, {
			id: resourceBlob.id,
			jop_share_id: share.id,
		});

		await models().share().updateSharedItems3();

		expect((await models().userItem().byUserId(user2.id)).length).toBe(4);
		await deleteApi(session1.id, `share_users/${shareUser.id}`);


		expect((await models().userItem().byUserId(user2.id)).length).toBe(0);
	});

	test('should share an empty folder', async () => {
		const { session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);

		await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', [
			{
				id: '000000000000000000000000000000F1',
				children: [],
			},
		]);
	});

	test('should unshare from a non-owner user who has deleted the root folder', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		const { item } = await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', [
			{
				id: '000000000000000000000000000000F1',
				children: [
					{
						id: '00000000000000000000000000000001',
					},
				],
			},
		]);

		await models().share().updateSharedItems3();

		expect((await models().userItem().byUserId(user2.id)).length).toBe(2);

		await deleteApi(session2.id, `items/root:/${item.name}:`);

		expect((await models().userItem().byUserId(user1.id)).length).toBe(2);
		expect((await models().userItem().byUserId(user2.id)).length).toBe(0);
	});

	test('should unshare a folder', async () => {
		// The process to unshare a folder is as follow:
		//
		// - Client call DELETE /api/share/:id
		// - Client sets the share_id of the folder and all sub-items to ""
		//
		// After doing this, when running updateSharedItems() on the server, it
		// will process a share that no longer exists. This is expected and
		// should not crash the process.

		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		const { item, share } = await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', [
			{
				id: '000000000000000000000000000000F1',
				children: [
					{
						id: '00000000000000000000000000000001',
					},
				],
			},
		]);

		await models().share().updateSharedItems3();

		expect((await models().userItem().byUserId(user2.id)).length).toBe(2);

		const noteItem = await models().item().loadByJopId(user1.id, '00000000000000000000000000000001');

		// Simulate unsharing by setting the share ID to "" and deleting the share object
		await deleteApi(session1.id, `shares/${share.id}`);
		await models().item().saveForUser(user1.id, { id: item.id, jop_share_id: '' });
		await models().item().saveForUser(user1.id, { id: noteItem.id, jop_share_id: '' });

		await models().share().updateSharedItems3();

		expect((await models().userItem().byUserId(user2.id)).length).toBe(0);
	});

	// test('should handle incomplete sync - orphan note is moved out of shared folder', async function() {
	// 	// - A note and its folder are moved to a shared folder.
	// 	// - However when data is synchronised, only the note is synced (not the folder).
	// 	// - Then later the note is synchronised.
	// 	// In that case, we need to make sure that both folder and note are eventually shared.

	// 	const { session: session1 } = await createUserAndSession(1);
	// 	const { user: user2, session: session2 } = await createUserAndSession(2);

	// 	const folderItem1 = await createFolder(session1.id, { id: '000000000000000000000000000000F1' });
	// 	const noteItem1 = await createNote(session1.id, { id: '00000000000000000000000000000001', parent_id: '000000000000000000000000000000F2' });
	// 	await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem1);
	// 	// await models().share().updateSharedItems2();

	// 	await createFolder(session1.id, { id: '000000000000000000000000000000F2', parent_id: folderItem1.jop_id });
	// 	await models().share().updateSharedItems2(user2.id);

	// 	const children = await models().item().children(user2.id);
	// 	expect(children.items.length).toBe(3);
	// 	expect(children.items.find(c => c.id === noteItem1.id)).toBeTruthy();
	// });

	test('should check permissions - cannot share a folder with yourself', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);

		await createItemTree(user1.id, '', { '000000000000000000000000000000F1': {} });
		const share = await postApi<Share>(session1.id, 'shares', { folder_id: '000000000000000000000000000000F1' });
		await expectHttpError(async () => postApi(session1.id, `shares/${share.id}/users`, { email: user1.email }), ErrorForbidden.httpCode);
	});

	test('should check permissions - cannot share a folder twice with a user', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2 } = await createUserAndSession(2);

		await createItemTree(user1.id, '', { '000000000000000000000000000000F1': {} });
		const share = await postApi<Share>(session1.id, 'shares', { folder_id: '000000000000000000000000000000F1' });
		await postApi(session1.id, `shares/${share.id}/users`, { email: user2.email });
		await expectHttpError(async () => postApi(session1.id, `shares/${share.id}/users`, { email: user2.email }), ErrorForbidden.httpCode);
	});

	test('should check permissions - cannot share a non-root folder', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);

		await createItemTree(user1.id, '', {
			'000000000000000000000000000000F1': {
				'000000000000000000000000000000F2': {},
			},
		});

		await expectHttpError(async () => postApi<Share>(session1.id, 'shares', { folder_id: '000000000000000000000000000000F2' }), ErrorForbidden.httpCode);
	});

	test('should check permissions - cannot share if share feature not enabled', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);
		await models().user().save({ id: user1.id, can_share_folder: 0 });

		await expectHttpError(async () =>
			shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', [
				{
					id: '000000000000000000000000000000F1',
					children: [],
				},
			]),
		ErrorForbidden.httpCode
		);
	});

	test('should check permissions - cannot share if share feature not enabled for recipient', async () => {
		const { session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);
		await models().user().save({ id: user2.id, can_share_folder: 0 });

		await expectHttpError(async () =>
			shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', [
				{
					id: '000000000000000000000000000000F1',
					children: [],
				},
			]),
		ErrorForbidden.httpCode
		);
	});

	test('should check permissions - by default sharing by note is always possible', async () => {
		const { session: session1 } = await createUserAndSession(1);

		const noteItem = await createNote(session1.id, {
			title: 'Testing title',
			body: 'Testing body',
		});

		const share = await postApi<Share>(session1.id, 'shares', {
			type: ShareType.Note,
			note_id: noteItem.jop_id,
		});

		expect(share).toBeTruthy();
	});

	test('should check permissions - cannot share with a disabled account', async () => {
		const { session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);
		await models().user().save({
			id: user2.id,
			enabled: 0,
		});

		await expectHttpError(async () =>
			shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', [
				{
					id: '000000000000000000000000000000F1',
					children: [],
				},
			]),
		ErrorForbidden.httpCode
		);
	});

	test('should allow sharing, unsharing and sharing again', async () => {
		// - U1 share a folder that contains a note
		// - U2 accept
		// - U2 syncs
		// - U1 remove U2
		// - U1 adds back U2
		// - U2 accept
		//
		// => Previously, the notebook would be deleted fro U2 due to a quirk in
		// delta sync, that doesn't handle user_items being deleted, then
		// created again. Instead U2 should end up with both the folder and the
		// note.
		//
		// Ref: https://discourse.joplinapp.org/t/20977

		const { session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		const { shareUser: shareUserA, share } = await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		});

		await models().share().updateSharedItems3();

		await deleteApi(session1.id, `share_users/${shareUserA.id}`);

		await models().share().updateSharedItems3();

		await inviteUserToShare(share, session1.id, user2.email, true);

		await models().share().updateSharedItems3();

		const page = await getApi<PaginatedDeltaChanges>(session2.id, 'items/root/delta', { query: { cursor: '' } });

		expect(page.items.length).toBe(2);
		expect(page.items.find(it => it.item_name === '000000000000000000000000000000F1.md').type).toBe(ChangeType.Create);
		expect(page.items.find(it => it.item_name === '00000000000000000000000000000001.md').type).toBe(ChangeType.Create);
	});

});
