import { Share, ShareType, ShareUser } from '../../db';
import { putFileContent, testFilePath } from '../../utils/testing/fileApiUtils';
import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession, models } from '../../utils/testing/testUtils';
import { postApiC, postApi, getApiC, patchApi } from '../../utils/testing/apiUtils';

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

	test('should share a file by link', async function() {
		const { session } = await createUserAndSession(1, false);
		const file = await putFileContent(session.id, 'root:/photo.jpg:', testFilePath());

		const context = await postApiC(session.id, 'shares', {
			type: ShareType.Link,
			file_id: 'root:/photo.jpg:',
		});

		expect(context.response.status).toBe(200);
		const shareId = context.response.body.id;

		{
			const context = await getApiC(session.id, `shares/${shareId}`);
			expect(context.response.body.id).toBe(shareId);
			expect(context.response.body.file_id).toBe(file.id);
			expect(context.response.body.type).toBe(ShareType.Link);
		}
	});

	test('should share a file with another user', async function() {
		const { session: session1 } = await createUserAndSession(1, false);
		const { user: user2, session: session2 } = await createUserAndSession(2, false);
		await putFileContent(session1.id, 'root:/photo.jpg:', testFilePath());

		const share = await postApi<Share>(session1.id, 'shares', {
			type: ShareType.App,
			file_id: 'root:/photo.jpg:',
		});

		let shareUser = await postApi(session1.id, `shares/${share.id}/users`, {
			email: user2.email,
		}) as ShareUser;

		shareUser = await models().shareUser().load(shareUser.id);
		expect(shareUser.share_id).toBe(share.id);
		expect(shareUser.user_id).toBe(user2.id);
		expect(shareUser.is_accepted).toBe(0);

		await patchApi<ShareUser>(session2.id, `share_users/${shareUser.id}`, { is_accepted: 1 });

		{
			shareUser = await models().shareUser().load(shareUser.id);
			expect(shareUser.is_accepted).toBe(1);
		}
	});

});
