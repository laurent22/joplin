import { Session, Share, ShareType, ShareUserStatus } from '../../services/database/types';
import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession, models, createItemTree, createFolder } from '../../utils/testing/testUtils';
import { postApi, getApi } from '../../utils/testing/apiUtils';
import { shareWithUserAndAccept, updateItemShareId } from '../../utils/testing/shareApiUtils';
import { PaginatedResults } from '../../models/utils/pagination';

describe('shares', () => {

	beforeAll(async () => {
		await beforeAllDb('shares');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should retrieve share info', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);
		const { user: user3 } = await createUserAndSession(3);

		const tree: Record<string, Record<string, null>> = {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
			'000000000000000000000000000000F2': {
				'00000000000000000000000000000002': null,
			},
		};

		const itemModel1 = models().item();

		await createItemTree(user1.id, '', tree);
		const folderItem = await itemModel1.loadByJopId(user1.id, '000000000000000000000000000000F1');
		const noteItem2 = await itemModel1.loadByJopId(user1.id, '00000000000000000000000000000002');
		const { share } = await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.Folder, folderItem);

		// Only share with user 3, without accepting it
		await postApi(session1.id, `shares/${share.id}/users`, {
			email: user3.email,
		});

		await postApi<Share>(session1.id, 'shares', {
			note_id: noteItem2.jop_id,
		});

		{
			const shares = await getApi<PaginatedResults<Share>>(session1.id, 'shares');
			expect(shares.items.length).toBe(2);

			const share1: Share = shares.items.find(it => it.folder_id === '000000000000000000000000000000F1');
			expect(share1).toBeTruthy();
			expect(share1.type).toBe(ShareType.Folder);

			const share2: Share = shares.items.find(it => it.note_id === '00000000000000000000000000000002');
			expect(share2).toBeTruthy();
			expect(share2.type).toBe(ShareType.Note);

			const shareUsers = await getApi<PaginatedResults<{ user: { email: string }; status: ShareUserStatus }>>(session1.id, `shares/${share1.id}/users`);
			expect(shareUsers.items.length).toBe(2);

			const su2 = shareUsers.items.find(su => su.user.email === 'user2@localhost');
			expect(su2).toBeTruthy();
			expect(su2.status).toBe(ShareUserStatus.Accepted);

			const su3 = shareUsers.items.find(su => su.user.email === 'user3@localhost');
			expect(su3).toBeTruthy();
			expect(su3.status).toBe(ShareUserStatus.Waiting);
		}
	});

	test('should allow unauthenticated access to a published folder share', async () => {
		const { session } = await createUserAndSession(1);
		await createFolder(session.id, { id: '000000000000000000000000000000F1', title: 'My Folder' });

		const share = await postApi<Share>(session.id, 'shares', {
			folder_id: '000000000000000000000000000000F1',
			type: ShareType.PublishedFolder,
		});

		const result = await getApi<Share>('', `shares/${share.id}`);
		expect(result.id).toBe(share.id);
		expect(result.type).toBe(ShareType.PublishedFolder);
	});

	test('should allow a share member to list shares associated with a note', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);
		await createItemTree(session1.user_id, '', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		});
		const note = await models().item().loadByJopId(user1.id, '00000000000000000000000000000001');
		const noteShare = await models().share().shareNote(user1, '00000000000000000000000000000001', '', false);

		const queryNoteShare = async (fromSession: Session) => {
			const result = await getApi(fromSession.id, 'shares', { query: { note: '00000000000000000000000000000001' } });
			return (result as { items: Share[] }).items;
		};

		expect(await queryNoteShare(session1)).toMatchObject([{ id: noteShare.id }]);
		// Before joining the share, user 2 should not see any shares associated with the note
		expect(await queryNoteShare(session2)).toMatchObject([]);

		const folderShareRoot = await models().item().loadByJopId(session1.user_id, '000000000000000000000000000000F1');
		const { share: folderShare } = await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.Folder, folderShareRoot);
		// Update share IDs so that the user_items table has the correct entries:
		await updateItemShareId(session1, folderShareRoot.id, folderShare.id);
		await updateItemShareId(session1, note.id, folderShare.id);
		await models().share().updateSharedItems3();

		// After joining the share, user 2 should be able to list the note-shares associated with the note
		expect(await queryNoteShare(session2)).toMatchObject([{ id: noteShare.id }]);
	});
});
