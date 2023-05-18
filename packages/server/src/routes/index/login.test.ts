import { Session } from '../../services/database/types';
import routeHandler from '../../middleware/routeHandler';
import { cookieGet } from '../../utils/cookies';
import { beforeAllDb, afterAllTests, beforeEachDb, koaAppContext, models, parseHtml, createUser } from '../../utils/testing/testUtils';
import { AppContext } from '../../utils/types';

async function doLogin(email: string, password: string): Promise<AppContext> {
	const context = await koaAppContext({
		request: {
			method: 'POST',
			url: '/login',
			body: {
				email: email,
				password: password,
			},
		},
	});

	await routeHandler(context);
	return context;
}

describe('index_login', () => {

	beforeAll(async () => {
		await beforeAllDb('index_login');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should show the login page', async () => {
		const context = await koaAppContext({
			request: {
				method: 'GET',
				url: '/login',
			},
		});

		await routeHandler(context);

		const doc = parseHtml(context.response.body as string);
		expect(!!doc.querySelector('input[name=email]')).toBe(true);
		expect(!!doc.querySelector('input[name=password]')).toBe(true);
	});

	test('should login', async () => {
		const user = await createUser(1);

		const context = await doLogin(user.email, '123456');
		const sessionId = cookieGet(context, 'sessionId');
		const session: Session = await models().session().load(sessionId);
		expect(session.user_id).toBe(user.id);
	});

	test('should not login with invalid credentials', async () => {
		const user = await createUser(1);

		{
			const context = await doLogin('bad', '123456');
			expect(!cookieGet(context, 'sessionId')).toBe(true);
		}

		{
			const context = await doLogin(user.email, 'bad');
			expect(!cookieGet(context, 'sessionId')).toBe(true);
		}
	});

});
