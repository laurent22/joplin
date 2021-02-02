import { ShareType } from '../../db';
import { putFileContent, testFilePath } from '../../utils/testing/fileApiUtils';
import { getShareContext, patchShareUser, postShare, postShareContext, postShareUser } from '../../utils/testing/shareApiUtils';
import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession, models } from '../../utils/testing/testUtils';

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

		const context = await postShareContext(session.id, ShareType.Link, 'root:/photo.jpg:');
		expect(context.response.status).toBe(200);
		const shareId = context.response.body.id;

		{
			const context = await getShareContext(shareId);
			expect(context.response.body.id).toBe(shareId);
			expect(context.response.body.file_id).toBe(file.id);
			expect(context.response.body.type).toBe(ShareType.Link);
		}
	});

	test('should share a file with another user', async function() {
		const { session: session1 } = await createUserAndSession(1, false);
		const { user: user2, session: session2 } = await createUserAndSession(2, false);
		await putFileContent(session1.id, 'root:/photo.jpg:', testFilePath());

		const share = await postShare(session1.id, ShareType.App, 'root:/photo.jpg:');
		let shareUser = await postShareUser(session1.id, share.id, user2.email);

		shareUser = await models().shareUser().load(shareUser.id);
		expect(shareUser.share_id).toBe(share.id);
		expect(shareUser.user_id).toBe(user2.id);
		expect(shareUser.is_accepted).toBe(0);

		await patchShareUser(session2.id, shareUser.id, { is_accepted: 1 });

		{
			shareUser = await models().shareUser().load(shareUser.id);
			expect(shareUser.is_accepted).toBe(1);
		}
	});

});
