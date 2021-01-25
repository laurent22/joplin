import { ShareType, Uuid } from '../../db';
import routeHandler from '../../middleware/routeHandler';
import { putFileContent, testFilePath } from '../../utils/testing/apiUtils';
import { beforeAllDb, afterAllTests, beforeEachDb, koaAppContext, createUserAndSession } from '../../utils/testing/testUtils';
import { AppContext } from '../../utils/types';

async function postShare(sessionId: string, itemId: Uuid): Promise<AppContext> {
	const context = await koaAppContext({
		sessionId: sessionId,
		request: {
			method: 'POST',
			url: '/api/shares',
			body: {
				file_id: itemId,
				type: ShareType.Link,
			},
		},
	});
	await routeHandler(context);
	return context;
}

async function getShare(shareId: Uuid): Promise<AppContext> {
	const context = await koaAppContext({
		request: {
			method: 'GET',
			url: `/api/shares/${shareId}`,
		},
	});
	await routeHandler(context);
	return context;
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

	test('should share a file', async function() {
		const { session } = await createUserAndSession(1, false);
		const file = await putFileContent(session.id, 'root:/photo.jpg:', testFilePath());

		const context = await postShare(session.id, 'root:/photo.jpg:');
		expect(context.response.status).toBe(200);
		const shareId = context.response.body.id;

		{
			const context = await getShare(shareId);
			expect(context.response.body.id).toBe(shareId);
			expect(context.response.body.file_id).toBe(file.id);
			expect(context.response.body.type).toBe(ShareType.Link);
		}
	});

});
