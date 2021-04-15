import { ChangeType, File, Share, ShareType, ShareUser } from '../../db';
import { putFileContent, testFilePath } from '../../utils/testing/fileApiUtils';
import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession, models, createFile, updateFile, checkThrowAsync, createNote, createFolder, updateItem, createItemTree } from '../../utils/testing/testUtils';
import { postApiC, postApi, getApiC, patchApi, getApi } from '../../utils/testing/apiUtils';
import { PaginatedFiles } from '../../models/FileModel';
import { PaginatedChangesOld } from '../../models/ChangeModel';
import { shareWithUserAndAccept } from '../../utils/testing/shareApiUtils';
import { msleep } from '../../utils/time';
import { ErrorBadRequest } from '../../utils/errors';
import { serializeJoplinItem, unserializeJoplinItem } from '../../apps/joplin/joplinUtils';
import { PaginatedItems } from '../../models/ItemModel';

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

	// test('should share a file by link', async function() {
	// 	const { session } = await createUserAndSession(1);
	// 	const file = await putFileContent(session.id, 'root:/photo.jpg:', testFilePath());

	// 	const context = await postApiC(session.id, 'shares', {
	// 		type: ShareType.Link,
	// 		file_id: 'root:/photo.jpg:',
	// 	});

	// 	expect(context.response.status).toBe(200);
	// 	const shareId = context.response.body.id;

	// 	{
	// 		const context = await getApiC(session.id, `shares/${shareId}`);
	// 		expect(context.response.body.id).toBe(shareId);
	// 		expect(context.response.body.file_id).toBe(file.id);
	// 		expect(context.response.body.type).toBe(ShareType.Link);
	// 	}
	// });

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
		const results = await getApi<PaginatedFiles>(session2.id, 'items/root/children');
		expect(results.items.length).toBe(1);
		expect(results.items[0].name).toBe(folderItem.name);

		const itemContent = await getApi<Buffer>(session2.id, 'items/root:/' + folderItem.name + ':/content');
		expect(itemContent.toString().includes('created by sharer')).toBe(true);

		// ----------------------------------------------------------------
		// If file is changed by sharee, sharer should see the change too
		// ----------------------------------------------------------------
		{
			const folder = await unserializeJoplinItem(itemContent.toString());
			folder.title = 'modified by recipient';
			await updateItem(session2.id, 'root:/' + folderItem.name + ':', await serializeJoplinItem(folder));

			// Double check that it didn't create a new item instead of updating it
			expect((await models().item().all()).length).toBe(1);

			const modContent = await getApi<Buffer>(session1.id, 'items/root:/' + folderItem.name + ':/content');
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

	test('should not share an already shared file', async function() {
		const { session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);
		const { user: user3, session: session3 } = await createUserAndSession(3);

		const sharedItem = await shareWithUserAndAccept(session1.id, session2.id, user2);
		const error = await checkThrowAsync(async () => shareWithUserAndAccept(session2.id, session3.id, user3, ShareType.App, sharedItem));
		expect(error.httpCode).toBe(ErrorBadRequest.httpCode);
	});

	// test('should see delta changes for linked files', async function() {
	// 	const { user: user1, session: session1 } = await createUserAndSession(1);
	// 	const { user: user2, session: session2 } = await createUserAndSession(2);
	// 	const rootDirId1 = await models().file({ userId: user1.id }).userRootFileId();
	// 	const rootDirId2 = await models().file({ userId: user2.id }).userRootFileId();

	// 	const { sharerFile, shareeFile } = await shareWithUserAndAccept(session1.id, user1, session2.id, user2);

	// 	let cursor1: string = null;
	// 	let cursor2: string = null;

	// 	{
	// 		const page1 = await getApi<PaginatedChangesOld>(session1.id, `files/${rootDirId1}/delta`);
	// 		expect(page1.items.length).toBe(1);
	// 		expect(page1.items[0].item.id).toBe(sharerFile.id);
	// 		expect(page1.items[0].type).toBe(ChangeType.Create);
	// 		cursor1 = page1.cursor;

	// 		const page2 = await getApi<PaginatedChangesOld>(session2.id, `files/${rootDirId2}/delta`);
	// 		expect(page2.items.length).toBe(1);
	// 		expect(page2.items[0].item.id).toBe(shareeFile.id);
	// 		expect(page2.items[0].type).toBe(ChangeType.Create);
	// 		cursor2 = page2.cursor;
	// 	}

	// 	// --------------------------------------------------------------------
	// 	// If file is changed on sharer side, sharee should see the changes
	// 	// --------------------------------------------------------------------

	// 	await msleep(1);
	// 	await updateFile(user1.id, sharerFile.id, 'from sharer');

	// 	{
	// 		const page1 = await getApi<PaginatedChangesOld>(session1.id, `files/${rootDirId1}/delta`, { query: { cursor: cursor1 } });
	// 		expect(page1.items.length).toBe(1);
	// 		expect(page1.items[0].item.id).toBe(sharerFile.id);
	// 		expect(page1.items[0].type).toBe(ChangeType.Update);
	// 		cursor1 = page1.cursor;

	// 		const page2 = await getApi<PaginatedChangesOld>(session2.id, `files/${rootDirId2}/delta`, { query: { cursor: cursor2 } });
	// 		expect(page2.items.length).toBe(1);
	// 		expect(page2.items[0].item.id).toBe(shareeFile.id);
	// 		expect(page2.items[0].type).toBe(ChangeType.Update);
	// 		expect(page2.items[0].item.updated_time).toBe(page1.items[0].item.updated_time);
	// 		cursor2 = page2.cursor;
	// 	}

	// 	// --------------------------------------------------------------------
	// 	// If file is changed on sharee side, sharer should see the changes
	// 	// --------------------------------------------------------------------

	// 	await msleep(1);
	// 	await updateFile(user2.id, shareeFile.id, 'from sharee');

	// 	{
	// 		const page1 = await getApi<PaginatedChangesOld>(session1.id, `files/${rootDirId1}/delta`, { query: { cursor: cursor1 } });
	// 		expect(page1.items.length).toBe(1);
	// 		expect(page1.items[0].item.id).toBe(sharerFile.id);
	// 		expect(page1.items[0].type).toBe(ChangeType.Update);
	// 		cursor1 = page1.cursor;

	// 		const page2 = await getApi<PaginatedChangesOld>(session2.id, `files/${rootDirId2}/delta`, { query: { cursor: cursor2 } });
	// 		expect(page2.items.length).toBe(1);
	// 		expect(page2.items[0].item.id).toBe(shareeFile.id);
	// 		expect(page2.items[0].type).toBe(ChangeType.Update);
	// 		cursor2 = page2.cursor;

	// 		// The updated_time properties don't necessarily match because first
	// 		// the sharer's file content is updated, and then the sharee's file
	// 		// metadata may be updated too.

	// 		// expect(page1.items[0].item.updated_time).toBe(page2.items[0].item.updated_time);
	// 	}
	// });

	// test('should see delta changes when a third user joins in', async function() {
	// 	// - User 1 shares a file with User 2
	// 	// - User 2 syncs and get a new delta cursor C2
	// 	// - User 3 shares a file with User 2
	// 	// - User 2 syncs **starting from C2**
	// 	// => The new changes from User 3 share should be visible

	// 	const { user: user1, session: session1 } = await createUserAndSession(1);
	// 	const { user: user2, session: session2 } = await createUserAndSession(2);
	// 	const { user: user3, session: session3 } = await createUserAndSession(3);
	// 	const rootDirId2 = await models().file({ userId: user2.id }).userRootFileId();

	// 	await shareWithUserAndAccept(session1.id, user1, session2.id, user2);
	// 	let cursor = null;

	// 	{
	// 		const page = await getApi<PaginatedChangesOld>(session2.id, `files/${rootDirId2}/delta`);
	// 		cursor = page.cursor;
	// 	}

	// 	const file3 = await createFile(user3.id, 'root:/test3.txt:', 'from user 3');
	// 	const { shareeFile } = await shareWithUserAndAccept(session3.id, user3, session2.id, user2, file3);

	// 	{
	// 		const page = await getApi<PaginatedChangesOld>(session2.id, `files/${rootDirId2}/delta`, { query: { cursor } });
	// 		cursor = page.cursor;
	// 		expect(page.items.length).toBe(1);
	// 		expect(page.items[0].type).toBe(ChangeType.Create);
	// 		expect(page.items[0].item.id).toBe(shareeFile.id);
	// 	}
	// });

});
