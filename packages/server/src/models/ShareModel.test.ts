import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, models, checkThrowAsync, createItem } from '../utils/testing/testUtils';
import { ErrorBadRequest, ErrorNotFound } from '../utils/errors';
import { ShareType } from '../db';

describe('ShareModel', function() {

	beforeAll(async () => {
		await beforeAllDb('ShareModel');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should validate share objects', async function() {
		const { user, session } = await createUserAndSession(1, true);

		const item = await createItem(session.id, 'root:/test.txt:', 'testing');

		let error = null;

		error = await checkThrowAsync(async () => await models().share({ userId: user.id }).createShare(20 as ShareType, item.id));
		expect(error instanceof ErrorBadRequest).toBe(true);

		error = await checkThrowAsync(async () => await models().share({ userId: user.id }).createShare(ShareType.Link, 'doesntexist'));
		expect(error instanceof ErrorNotFound).toBe(true);
	});

});
