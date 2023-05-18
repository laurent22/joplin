import { ErrorForbidden } from '../utils/errors';
import { beforeAllDb, afterAllTests, beforeEachDb, koaAppContext, koaNext, expectNotThrow, expectHttpError, createUserAndSession } from '../utils/testing/testUtils';
import checkAdminHandler from './checkAdminHandler';

describe('checkAdminHandler', () => {

	beforeAll(async () => {
		await beforeAllDb('checkAdminHandler');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should access /admin if the user is admin', async () => {
		const { session } = await createUserAndSession(1, true);

		const context = await koaAppContext({
			sessionId: session.id,
			request: {
				method: 'GET',
				url: '/admin/organizations',
			},
		});

		await expectNotThrow(async () => checkAdminHandler(context, koaNext));
	});

	test('should not access /admin if the user is not admin', async () => {
		const { session } = await createUserAndSession(1);

		const context = await koaAppContext({
			sessionId: session.id,
			request: {
				method: 'GET',
				url: '/admin/organizations',
			},
		});

		await expectHttpError(async () => checkAdminHandler(context, koaNext), ErrorForbidden.httpCode);
	});

	test('should not access /admin if the user is not logged in', async () => {
		const context = await koaAppContext({
			request: {
				method: 'GET',
				url: '/admin/organizations',
			},
		});

		await expectHttpError(async () => checkAdminHandler(context, koaNext), ErrorForbidden.httpCode);
	});

});
