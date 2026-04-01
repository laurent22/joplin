import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, models, checkThrowAsync, createItem, createItemTree, expectNotThrow, createNote } from '../utils/testing/testUtils';
import { ErrorBadRequest, ErrorNotFound } from '../utils/errors';
import { ShareType } from '../services/database/types';
import { inviteUserToShare, shareFolderWithUser, shareWithUserAndAccept, updateItemShareId } from '../utils/testing/shareApiUtils';
import { withWarningSilenced } from '@joplin/lib/testing/test-utils';

// Goes through the process of:
// 1. Creating two users/sessions
// 2. Creating a share and accepting it
// 3. Moving a note created by the share recipient in to the share
//
// This creates a note owned by the share recipient, but within the
// share.
const createShareWithNoteOwnedByRecipient = async () => {
	const { session: session1 } = await createUserAndSession(1);
	const { session: session2, user: user2 } = await createUserAndSession(2);

	await createItemTree(session1.user_id, '', {
		'000000000000000000000000000000F1': {
		},
	});
	await createItemTree(session2.user_id, '', {
		'000000000000000000000000000000F2': {
			'00000000000000000000000000000001': null,
		},
	});

	const shareRoot = await models().item().loadByJopId(session1.user_id, '000000000000000000000000000000F1');

	// Note should initially be owned by user 2
	let note = await models().item().loadByJopId(session2.user_id, '00000000000000000000000000000001');
	expect(note.owner_id).toBe(session2.user_id);

	const { share, shareUser } = await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.Folder, shareRoot);

	await updateItemShareId(session1, shareRoot.id, share.id);
	await models().share().updateSharedItems3();

	// Changing the note's share ID and parent should not change the owner ID
	note = await updateItemShareId(session2, note.id, share.id);
	note = await models().item().saveForUser(session1.user_id, {
		...note,
		jop_parent_id: '000000000000000000000000000000F1',
	});

	await models().share().updateSharedItems3();
	expect(note.owner_id).toBe(session2.user_id);

	return { share, shareUser, note, session1, session2 };
};

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

	test('should be possible to run createSharedFolderUserItems multiple times concurrently', async () => {
		const { session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);
		const { user: user3 } = await createUserAndSession(3);

		const { share } = await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
				'00000000000000000000000000000002': null,
				'00000000000000000000000000000003': null,
			},
		});

		expect(await models().userItem().byUserId(user3.id)).toHaveLength(0);
		await Promise.all([
			models().share().createSharedFolderUserItems(share.id, user3.id),
			models().share().createSharedFolderUserItems(share.id, user3.id),
			models().share().createSharedFolderUserItems(share.id, user3.id),
		]);
		expect(await models().userItem().byUserId(user3.id)).toHaveLength(4);
	});

	test.each([
		{ alsoUnshare: false, label: '' },
		{ alsoUnshare: true, label: 'and the item is also unshared' },
	])('should delete UserItem records when a user no longer has access to a share $label', async ({ alsoUnshare }) => {
		const { session: session1 } = await createUserAndSession(1);
		const { session: session2, user: user2 } = await createUserAndSession(2);

		const getUser2UserItems = () => models().userItem().byUserId(user2.id);
		expect(await getUser2UserItems()).toHaveLength(0);

		await createItemTree(session1.user_id, '', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		});
		const shareRoot = await models().item().loadByJopId(session1.user_id, '000000000000000000000000000000F1');
		const note = await models().item().loadByJopId(session1.user_id, '00000000000000000000000000000001');
		expect(shareRoot).toBeTruthy();

		const { share, shareUser } = await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.Folder, shareRoot);

		await updateItemShareId(session1, shareRoot.id, share.id);
		await updateItemShareId(session1, note.id, share.id);
		await models().share().updateSharedItems3();

		// Should have shared successfully:
		expect(await getUser2UserItems()).toHaveLength(2);

		// Removing the user from the share should delete the UserItems
		await models().shareUser().delete(shareUser.id);
		expect(await getUser2UserItems()).toHaveLength(0);

		// Simulate a race condition by restoring one of the user items:
		await models().userItem().add(user2.id, note.id);
		expect(await getUser2UserItems()).toHaveLength(1);

		if (alsoUnshare) {
			await updateItemShareId(session1, note.id, '');
		}

		// The extra UserItem should be removed when processing the share's changes:
		await withWarningSilenced(/Deleting unexpected userItem for user/, async () => {
			await models().share().updateSharedItems3();
		});
		expect(await getUser2UserItems()).toHaveLength(0);
	});

	test.each([
		{ deleteShare: false, label: '' },
		// Deleting the share means that the maintenance task can't use share.owner_id to
		// determine the new owner for the item.
		{ deleteShare: true, label: 'and the share is deleted' },
	])('should update owner_id when the original owner no longer has access $label', async ({ deleteShare }) => {
		const { share, shareUser, note, session1, session2 } = await createShareWithNoteOwnedByRecipient();
		expect(note.owner_id).toBe(session2.user_id);

		// Remove session2.user_id from the share either by deleting the entire share or
		// by removing the shareUser.
		if (deleteShare) {
			await models().share().delete(share.id);
		} else {
			await models().shareUser().delete(shareUser.id);
		}
		await models().share().updateSharedItems3();

		const updatedNote = await models().item().load(note.id);
		// The owner_id should be updated
		expect(updatedNote.owner_id).toBe(session1.user_id);
		// ...but it should still be part of the share.
		expect(updatedNote.jop_share_id).toBe(share.id);
	});

	test('should not update owner_id after unsharing if an item has been moved out of a share by the item\'s owner', async () => {
		const { shareUser, note, session2 } = await createShareWithNoteOwnedByRecipient();

		await updateItemShareId(session2, note.id, '');

		// Removing session2 from the share should keep the item's owner the same
		await models().shareUser().delete(shareUser.id);
		await models().share().updateSharedItems3();

		const updatedNote = await models().item().load(note.id);
		expect(updatedNote.owner_id).toBe(session2.user_id);
	});

	// linkedNoteShareUrl: R=0, I=0, P=ε → O=N
	test('should return null from linkedNoteShareUrl when the linked note does not exist', async () => {
		const { user: user1 } = await createUserAndSession(1);

		await createItemTree(user1.id, '', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		});

		const share = await models().share().shareNote(user1, '00000000000000000000000000000001', '', false);
		const url = await models().share().linkedNoteShareUrl(share, '00000000000000000000000000000099');
		expect(url).toBeNull();
	});

	// linkedNoteShareUrl: R=0, I=1, P=0 → O=N
	test('should return null from linkedNoteShareUrl when the linked note has no note share', async () => {
		const { user: user1 } = await createUserAndSession(1);

		await createItemTree(user1.id, '', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
				'00000000000000000000000000000002': null,
			},
		});

		const share = await models().share().shareNote(user1, '00000000000000000000000000000001', '', false);
		// note 2 exists but is not shared via ShareType.Note
		const url = await models().share().linkedNoteShareUrl(share, '00000000000000000000000000000002');
		expect(url).toBeNull();
	});

	// linkedNoteShareUrl: R=1, I=ε, P=ε → O=N
	test('should return null from linkedNoteShareUrl when the share is recursive', async () => {
		const { user: user1 } = await createUserAndSession(1);

		await createItemTree(user1.id, '', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		});

		const share = await models().share().shareNote(user1, '00000000000000000000000000000001', '', true);
		const url = await models().share().linkedNoteShareUrl(share, '00000000000000000000000000000001');
		expect(url).toBeNull();
	});

	// linkedNoteShareUrl: R=0, I=1, P=1 → O=U
	test('should return a URL from linkedNoteShareUrl when the linked note is shared', async () => {
		const { user: user1 } = await createUserAndSession(1);

		await createItemTree(user1.id, '', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
				'00000000000000000000000000000002': null,
			},
		});

		const share = await models().share().shareNote(user1, '00000000000000000000000000000001', '', false);
		// note 2 is shared via ShareType.Note, making P=1 for it
		const note2Share = await models().share().shareNote(user1, '00000000000000000000000000000002', '', false);
		const url = await models().share().linkedNoteShareUrl(share, '00000000000000000000000000000002');
		expect(url).toContain(`/shares/${note2Share.id}`);
	});
});
