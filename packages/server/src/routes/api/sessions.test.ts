import { Session } from '../../services/database/types';
import routeHandler from '../../middleware/routeHandler';
import { beforeAllDb, afterAllTests, beforeEachDb, koaAppContext, createUserAndSession, models } from '../../utils/testing/testUtils';
import { AppContext } from '../../utils/types';

async function postSession(email: string, password: string): Promise<AppContext> {
	const context = await koaAppContext({
		request: {
			method: 'POST',
			url: '/api/sessions',
			body: {
				email: email,
				password: password,
			},
		},
	});

	await routeHandler(context);

	return context;
}

describe('api/sessions', () => {

	beforeAll(async () => {
		await beforeAllDb('api/sessions');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should login user', async () => {
		const { user, password } = await createUserAndSession(1, false);

		const context = await postSession(user.email, password);
		expect(context.response.status).toBe(200);
		expect(!!(context.response.body as any).id).toBe(true);

		const session: Session = await models().session().load((context.response.body as any).id);
		expect(session.user_id).toBe(user.id);
	});

	test('should not login user with wrong password', async () => {
		const { user } = await createUserAndSession(1, false);

		{
			const context = await postSession(user.email, 'wrong');
			expect(context.response.status).toBe(403);
		}

		{
			const context = await postSession('wrong@wrong.com', '123456');
			expect(context.response.status).toBe(403);
		}

		{
			const context = await postSession('', '');
			expect(context.response.status).toBe(403);
		}
	});

});
