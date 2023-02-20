import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, models, checkThrowAsync, createItem, createItemTree, expectNotThrow, createNote } from '../utils/testing/testUtils';
import { ErrorBadRequest, ErrorNotFound } from '../utils/errors';
import { ShareType } from '../services/database/types';
import { inviteUserToShare, shareFolderWithUser, shareWithUserAndAccept } from '../utils/testing/shareApiUtils';

describe('ShareModel', () => {

	beforeAll(async () => {
		await beforeAllDb('ShareModel');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should validate share objects', async () => {
		const { user, session } = await createUserAndSession(1, true);

		const item = await createItem(session.id, 'root:/test.txt:', 'testing');

		let error = null;

		error = await checkThrowAsync(async () => await models().share().createShare(user.id, 20 as ShareType, item.id));
		expect(error instanceof ErrorBadRequest).toBe(true);

		error = await checkThrowAsync(async () => await models().share().createShare(user.id, ShareType.Note, 'doesntexist'));
		expect(error instanceof ErrorNotFound).toBe(true);
	});

	test('should get all shares of a user', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);
		const { user: user3, session: session3 } = await createUserAndSession(3);

		await createItemTree(user1.id, '', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		});

		await createItemTree(user2.id, '', {
			'000000000000000000000000000000F2': {
				'00000000000000000000000000000002': null,
			},
		});

		const folderItem1 = await models().item().loadByJopId(user1.id, '000000000000000000000000000000F1');
		await shareWithUserAndAccept(session1.id, session3.id, user3, ShareType.Folder, folderItem1);

		const folderItem2 = await models().item().loadByJopId(user2.id, '000000000000000000000000000000F2');
		await shareWithUserAndAccept(session2.id, session1.id, user1, ShareType.Folder, folderItem2);

		const shares1 = await models().share().byUserId(user1.id, ShareType.Folder);
		const shares2 = await models().share().byUserId(user2.id, ShareType.Folder);
		const shares3 = await models().share().byUserId(user3.id, ShareType.Folder);

		expect(shares1.length).toBe(2);
		expect(shares1.find(s => s.folder_id === '000000000000000000000000000000F1')).toBeTruthy();
		expect(shares1.find(s => s.folder_id === '000000000000000000000000000000F2')).toBeTruthy();

		expect(shares2.length).toBe(1);
		expect(shares2.find(s => s.folder_id === '000000000000000000000000000000F2')).toBeTruthy();

		expect(shares3.length).toBe(1);
		expect(shares3.find(s => s.folder_id === '000000000000000000000000000000F1')).toBeTruthy();

		const participatedShares1 = await models().share().participatedSharesByUser(user1.id, ShareType.Folder);
		const participatedShares2 = await models().share().participatedSharesByUser(user2.id, ShareType.Folder);
		const participatedShares3 = await models().share().participatedSharesByUser(user3.id, ShareType.Folder);

		expect(participatedShares1.length).toBe(1);
		expect(participatedShares1[0].owner_id).toBe(user2.id);
		expect(participatedShares1[0].folder_id).toBe('000000000000000000000000000000F2');

		expect(participatedShares2.length).toBe(0);

		expect(participatedShares3.length).toBe(1);
		expect(participatedShares3[0].owner_id).toBe(user1.id);
		expect(participatedShares3[0].folder_id).toBe('000000000000000000000000000000F1');
	});

	test('should generate only one link per shared note', async () => {
		const { user: user1 } = await createUserAndSession(1);

		await createItemTree(user1.id, '', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		});

		const share1 = await models().share().shareNote(user1, '00000000000000000000000000000001', '', false);
		const share2 = await models().share().shareNote(user1, '00000000000000000000000000000001', '', false);

		expect(share1.id).toBe(share2.id);
	});

	test('should delete a note that has been shared', async () => {
		const { user: user1 } = await createUserAndSession(1);

		await createItemTree(user1.id, '', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		});

		await models().share().shareNote(user1, '00000000000000000000000000000001', '', false);
		const noteItem = await models().item().loadByJopId(user1.id, '00000000000000000000000000000001');
		await models().item().delete(noteItem.id);
		expect(await models().item().load(noteItem.id)).toBeFalsy();
	});

	test('should count number of items in share', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);

		const { share } = await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		});

		expect(await models().share().itemCountByShareId(share.id)).toBe(2);

		await models().item().delete((await models().item().loadByJopId(user1.id, '00000000000000000000000000000001')).id);
		await models().item().delete((await models().item().loadByJopId(user1.id, '000000000000000000000000000000F1')).id);

		expect(await models().share().itemCountByShareId(share.id)).toBe(0);
	});

	test('should count number of items in share per recipient', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);
		const { user: user3 } = await createUserAndSession(3);
		await createUserAndSession(4); // To check that he's not included in the results since the items are not shared with him

		const { share } = await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		});

		await inviteUserToShare(share, session1.id, user3.email);

		const rows = await models().share().itemCountByShareIdPerUser(share.id);

		expect(rows.length).toBe(3);
		expect(rows.find(r => r.user_id === user1.id).item_count).toBe(2);
		expect(rows.find(r => r.user_id === user2.id).item_count).toBe(2);
		expect(rows.find(r => r.user_id === user3.id).item_count).toBe(2);
	});

	test('should create user items for shared folder', async () => {
		const { session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);
		const { user: user3 } = await createUserAndSession(3);
		await createUserAndSession(4); // To check that he's not included in the results since the items are not shared with him

		const { share } = await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		});

		// When running that function with a new user, it should get all the
		// share items
		expect((await models().userItem().byUserId(user3.id)).length).toBe(0);
		await models().share().createSharedFolderUserItems(share.id, user3.id);
		expect((await models().userItem().byUserId(user3.id)).length).toBe(2);

		// Calling the function again should not throw - it should just ignore
		// the items that have already been added.
		await expectNotThrow(async () => models().share().createSharedFolderUserItems(share.id, user3.id));

		// After adding a new note to the share, and calling the function, it
		// should add the note to the other user collection.
		expect(await models().share().itemCountByShareId(share.id)).toBe(2);

		await createNote(session1.id, {
			id: '00000000000000000000000000000003',
			share_id: share.id,
		});

		expect(await models().share().itemCountByShareId(share.id)).toBe(3);
		await models().share().createSharedFolderUserItems(share.id, user3.id);
		expect(await models().share().itemCountByShareId(share.id)).toBe(3);
	});

});
