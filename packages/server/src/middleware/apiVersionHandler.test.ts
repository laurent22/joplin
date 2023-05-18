import config from '../config';
import { ErrorPreconditionFailed } from '../utils/errors';
import { beforeAllDb, afterAllTests, beforeEachDb, koaAppContext, koaNext, expectNotThrow, expectHttpError } from '../utils/testing/testUtils';
import apiVersionHandler from './apiVersionHandler';

describe('apiVersionHandler', () => {

	beforeAll(async () => {
		await beforeAllDb('apiVersionHandler');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should work if no version header is provided', async () => {
		const context = await koaAppContext({});
		await expectNotThrow(async () => apiVersionHandler(context, koaNext));
	});

	test('should work if the header version number is lower than the server version', async () => {
		config().joplinServerVersion = '2.1.0';

		const context = await koaAppContext({
			request: {
				method: 'GET',
				url: '/api/ping',
				headers: {
					'x-api-min-version': '2.0.0',
				},
			},
		});

		await expectNotThrow(async () => apiVersionHandler(context, koaNext));
	});

	test('should not work if the header version number is greater than the server version', async () => {
		config().joplinServerVersion = '2.1.0';

		const context = await koaAppContext({
			request: {
				method: 'GET',
				url: '/api/ping',
				headers: {
					'x-api-min-version': '2.2.0',
				},
			},
		});

		await expectHttpError(async () => apiVersionHandler(context, koaNext), ErrorPreconditionFailed.httpCode);
	});

});
