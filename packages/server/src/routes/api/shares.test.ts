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

async function getShare(sessionId: string, shareId: Uuid): Promise<AppContext> {
	const context = await koaAppContext({
		sessionId: sessionId,
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

	test('should share a note', async function() {
		const { session } = await createUserAndSession(1, false);
		await putFileContent(session.id, 'root:/photo.jpg:', testFilePath());

		const context = await postShare(session.id, 'root:/photo.jpg:');
		expect(context.response.status).toBe(200);

		const shareId = context.response.body.id;
		const context2 = await getShare(session.id, shareId);

		console.info(context2.response.body);
	});

});
