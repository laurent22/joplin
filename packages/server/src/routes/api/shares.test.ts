import { ShareType } from '../../db';
import { putFileContent, testFilePath } from '../../utils/testing/fileApiUtils';
import { getShareContext, postShareContext } from '../../utils/testing/shareApiUtils';
import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession } from '../../utils/testing/testUtils';

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

	test('should share a file', async function() {
		const { session } = await createUserAndSession(1, false);
		const file = await putFileContent(session.id, 'root:/photo.jpg:', testFilePath());

		const context = await postShareContext(session.id, 'root:/photo.jpg:');
		expect(context.response.status).toBe(200);
		const shareId = context.response.body.id;

		{
			const context = await getShareContext(shareId);
			expect(context.response.body.id).toBe(shareId);
			expect(context.response.body.file_id).toBe(file.id);
			expect(context.response.body.type).toBe(ShareType.Link);
		}
	});

});
