import { Share, ShareType, ShareUser, User } from '../../db';
import { putFileContent, testFilePath } from '../../utils/testing/fileApiUtils';
import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession, models, createFile } from '../../utils/testing/testUtils';
import { postApiC, postApi, getApiC, patchApi, getApi } from '../../utils/testing/apiUtils';
import { PaginatedFiles } from '../../models/FileModel';

async function shareWithUserAndAccept(sharerSessionId:string, sharer:User, shareeSessionId:string, sharee:User) {
	await createFile(sharer.id, 'root:/test.txt:', 'testing share');

	const share = await postApi<Share>(sharerSessionId, 'shares', {
		type: ShareType.App,
		file_id: 'root:/test.txt:',
	});

	let shareUser = await postApi(sharerSessionId, `shares/${share.id}/users`, {
		email: sharee.email,
	}) as ShareUser;

	shareUser = await models().shareUser().load(shareUser.id);

	await patchApi<ShareUser>(shareeSessionId, `share_users/${shareUser.id}`, { is_accepted: 1 });
}

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
		const { user: user1, session: session1 } = await createUserAndSession(1, false);
		const { user: user2, session: session2 } = await createUserAndSession(2, false);
		await createFile(user1.id, 'root:/test.txt:', 'testing share');

		// ----------------------------------------------------------------
		// Create the file share object
		// ----------------------------------------------------------------
		const share = await postApi<Share>(session1.id, 'shares', {
			type: ShareType.App,
			file_id: 'root:/test.txt:',
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
		const results = await getApi<PaginatedFiles>(session2.id, 'files/root/children');
		expect(results.items.length).toBe(1);
		expect(results.items[0].name).toBe('test.txt');
		
		const fileContent = await getApi<Buffer>(session2.id, 'files/root:/test.txt:/content');
		expect(fileContent.toString()).toBe('testing share');
	});

	// TODO: test delta:
	// - File is changed on sharer side
	// - File is changed on sharee side
	// - A third user shares a file - check delta is correct even when starting from an existing context

	// test('shared file should have the same content', async function() {

	// });

});
