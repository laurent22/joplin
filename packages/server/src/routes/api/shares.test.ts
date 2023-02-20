import { Share, ShareType, ShareUserStatus } from '../../services/database/types';
import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession, models, createItemTree } from '../../utils/testing/testUtils';
import { postApi, getApi } from '../../utils/testing/apiUtils';
import { shareWithUserAndAccept } from '../../utils/testing/shareApiUtils';
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

		const tree: any = {
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
			const shares = await getApi<PaginatedResults<any>>(session1.id, 'shares');
			expect(shares.items.length).toBe(2);

			const share1: Share = shares.items.find(it => it.folder_id === '000000000000000000000000000000F1');
			expect(share1).toBeTruthy();
			expect(share1.type).toBe(ShareType.Folder);

			const share2: Share = shares.items.find(it => it.note_id === '00000000000000000000000000000002');
			expect(share2).toBeTruthy();
			expect(share2.type).toBe(ShareType.Note);

			const shareUsers = await getApi<PaginatedResults<any>>(session1.id, `shares/${share1.id}/users`);
			expect(shareUsers.items.length).toBe(2);

			const su2 = shareUsers.items.find(su => su.user.email === 'user2@localhost');
			expect(su2).toBeTruthy();
			expect(su2.status).toBe(ShareUserStatus.Accepted);

			const su3 = shareUsers.items.find(su => su.user.email === 'user3@localhost');
			expect(su3).toBeTruthy();
			expect(su3.status).toBe(ShareUserStatus.Waiting);
		}
	});

});
