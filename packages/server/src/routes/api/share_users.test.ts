import { ShareType, ShareUserStatus } from '../../services/database/types';
import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession, models, createItemTree, expectHttpError } from '../../utils/testing/testUtils';
import { getApi, patchApi } from '../../utils/testing/apiUtils';
import { shareFolderWithUser, shareWithUserAndAccept } from '../../utils/testing/shareApiUtils';
import { ErrorBadRequest, ErrorForbidden } from '../../utils/errors';
import { PaginatedResults } from '../../models/utils/pagination';

describe('share_users', () => {

	beforeAll(async () => {
		await beforeAllDb('share_users');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should list user invitations', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		await createItemTree(user1.id, '', {
			'000000000000000000000000000000F1': {},
			'000000000000000000000000000000F2': {},
		});
		const folderItem1 = await models().item().loadByJopId(user1.id, '000000000000000000000000000000F1');
		const folderItem2 = await models().item().loadByJopId(user1.id, '000000000000000000000000000000F2');
		const { share: share1 } = await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.Folder, folderItem1);
		const { share: share2 } = await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.Folder, folderItem2);

		const shareUsers = await getApi<PaginatedResults<any>>(session2.id, 'share_users');
		expect(shareUsers.items.length).toBe(2);
		expect(shareUsers.items.find(su => su.share.id === share1.id)).toBeTruthy();
		expect(shareUsers.items.find(su => su.share.id === share2.id)).toBeTruthy();
	});

	test('should not change someone else shareUser object', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		await createItemTree(user1.id, '', { '000000000000000000000000000000F1': {} });
		const folderItem = await models().item().loadByJopId(user1.id, '000000000000000000000000000000F1');
		const { shareUser } = await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.Folder, folderItem);

		// User can modify own UserShare object
		await patchApi(session2.id, `share_users/${shareUser.id}`, { status: ShareUserStatus.Rejected });

		// User cannot modify someone else UserShare object
		await expectHttpError(async () => patchApi(session1.id, `share_users/${shareUser.id}`, { status: ShareUserStatus.Accepted }), ErrorForbidden.httpCode);
	});

	test('should not allow accepting a share twice or more', async () => {
		const { session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);

		const { shareUser } = await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		});

		await expectHttpError(async () => patchApi(session2.id, `share_users/${shareUser.id}`, { status: ShareUserStatus.Accepted }), ErrorBadRequest.httpCode);
	});

});
