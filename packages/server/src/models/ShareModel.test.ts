import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, models, checkThrowAsync } from '../utils/testing/testUtils';
import { ShareType } from '../db';
import { ErrorBadRequest, ErrorNotFound } from '../utils/errors';

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
		const { user } = await createUserAndSession(1, true);
		const fileModel = models().file({ userId: user.id });
		const file = await fileModel.save({
			name: 'test',
			parent_id: await fileModel.userRootFileId(),
		});

		let error = null;

		error = await checkThrowAsync(async () => await models().share({ userId: user.id }).add(20 as ShareType, file.id));
		expect(error instanceof ErrorBadRequest).toBe(true);

		error = await checkThrowAsync(async () => await models().share({ userId: user.id }).add(ShareType.Link, 'doesntexist'));
		expect(error instanceof ErrorNotFound).toBe(true);
	});

});
