import { ChangeType, Share, ShareType, ShareUser } from '../../db';
import { putFileContent, testFilePath } from '../../utils/testing/fileApiUtils';
import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession, models, createFile, updateFile } from '../../utils/testing/testUtils';
import { postApiC, postApi, getApiC, patchApi, getApi } from '../../utils/testing/apiUtils';
import { PaginatedFiles } from '../../models/FileModel';
import { PaginatedChanges } from '../../models/ChangeModel';
import { shareWithUserAndAccept } from '../../utils/testing/shareApiUtils';
import { msleep } from '../../utils/time';

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
		const { session } = await createUserAndSession(1);
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
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);
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

	test('should get updated time of shared file', async function() {
		// If sharer changes the file, sharee should see the updated_time of the sharer file.
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		let { sharerFile, shareeFile } = await shareWithUserAndAccept(session1.id, user1, session2.id, user2);

		await msleep(1);

		await updateFile(user1.id, sharerFile.id, 'content modified');

		sharerFile = await models().file({ userId: user1.id }).load(sharerFile.id);
		shareeFile = await models().file({ userId: user2.id }).load(shareeFile.id);
		expect(shareeFile.updated_time).toBe(sharerFile.updated_time);
	});

	test('should see delta changes for linked files', async function() {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);
		const rootDirId1 = await models().file({ userId: user1.id }).userRootFileId();
		const rootDirId2 = await models().file({ userId: user2.id }).userRootFileId();

		const { sharerFile, shareeFile } = await shareWithUserAndAccept(session1.id, user1, session2.id, user2);

		let cursor1: string = null;
		let cursor2: string = null;

		{
			const page1 = await getApi<PaginatedChanges>(session1.id, `files/${rootDirId1}/delta`);
			expect(page1.items.length).toBe(1);
			expect(page1.items[0].item.id).toBe(sharerFile.id);
			expect(page1.items[0].type).toBe(ChangeType.Create);
			cursor1 = page1.cursor;

			const page2 = await getApi<PaginatedChanges>(session2.id, `files/${rootDirId2}/delta`);
			expect(page2.items.length).toBe(1);
			expect(page2.items[0].item.id).toBe(shareeFile.id);
			expect(page2.items[0].type).toBe(ChangeType.Create);
			cursor2 = page2.cursor;
		}

		await msleep(1);

		await updateFile(user1.id, sharerFile.id, 'from sharer');

		{
			const page1 = await getApi<PaginatedChanges>(session1.id, `files/${rootDirId1}/delta`, { query: { cursor: cursor1 } });
			expect(page1.items.length).toBe(1);
			expect(page1.items[0].item.id).toBe(sharerFile.id);
			expect(page1.items[0].type).toBe(ChangeType.Update);
			cursor1 = page1.cursor;

			const page2 = await getApi<PaginatedChanges>(session2.id, `files/${rootDirId2}/delta`, { query: { cursor: cursor2 } });
			expect(page2.items.length).toBe(1);
			expect(page2.items[0].item.id).toBe(shareeFile.id);
			expect(page2.items[0].type).toBe(ChangeType.Update);
			expect(page2.items[0].item.updated_time).toBe(page1.items[0].item.updated_time);
			cursor2 = page2.cursor;
		}
	});

	// TODO: test delta:
	// - File is changed on sharer side
	// - File is changed on sharee side
	// - A third user shares a file - check delta is correct even when starting from an existing context

	// test('shared file should have the same content', async function() {

	// });

});
