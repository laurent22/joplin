import { afterAllTests, beforeAllDb, koaAppContext, models } from './utils/testing/testUtils';

describe('db.initialState', () => {

	afterEach(async () => {
		await afterAllTests();
	});

	let testIndex = 0;
	it.each([
		{
			label: 'should create a single admin user with a custom default password',
			envValues: {
				DEFAULT_ADMIN_PASSWORD: 'test-default',
			},
			test: async () => {
				const ctx = await koaAppContext();
				expect(await models().user().login('admin@localhost', 'admin', ctx.joplin.services)).toBeNull();
				expect(await models().user().login('admin@localhost', 'test-default', ctx.joplin.services)).toBeTruthy();
			},
		},
		{
			label: 'should create a single admin user with a custom default password',
			envValues: {
				DEFAULT_ADMIN_PASSWORD: undefined,
			},
			test: async () => {
				const ctx = await koaAppContext();
				expect(await models().user().login('admin@localhost', 'admin', ctx.joplin.services)).toBeTruthy();
				expect(await models().user().login('admin@localhost', 'test-default', ctx.joplin.services)).toBeNull();
			},
		},
	])('$label', async ({ envValues, test }) => {
		// Call beforeAllDb so that each case has its own database, initialized based on a different environment
		// Use a different databaseKey to avoid locking issues on Windows.
		const databaseKey = `db.initialState.${testIndex ++}`;
		await beforeAllDb(databaseKey, {
			envValues,
		});

		await test();
	});

});
