import { afterAllTests, beforeAllDb, beforeEachDb, expectThrow, makeTempFileWithContent } from './utils/testing/testUtils';
import { parseEnv } from './env';

describe('env', function() {

	beforeAll(async () => {
		await beforeAllDb('env');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	it('should parse env values', async function() {
		const result = await parseEnv({
			DB_CLIENT: 'pg',
			POSTGRES_PORT: '123',
			MAILER_ENABLED: 'true',
			SIGNUP_ENABLED: 'false',
			TERMS_ENABLED: '0',
			ACCOUNT_TYPES_ENABLED: '1',
		});

		expect(result.DB_CLIENT).toBe('pg');
		expect(result.POSTGRES_PORT).toBe(123);
		expect(result.MAILER_ENABLED).toBe(true);
		expect(result.SIGNUP_ENABLED).toBe(false);
		expect(result.TERMS_ENABLED).toBe(false);
		expect(result.ACCOUNT_TYPES_ENABLED).toBe(true);
	});

	it('should overrides default values', async function() {
		expect(parseEnv({})).resolves.toHaveProperty('POSTGRES_USER', 'joplin');
		expect(parseEnv({}, { POSTGRES_USER: 'other' }))
			.resolves.toHaveProperty('POSTGRES_USER', 'other');
	});

	it('should validate values', async function() {
		await expectThrow(async () => await parseEnv({ POSTGRES_PORT: 'notanumber' }));
		await expectThrow(async () => await parseEnv({ MAILER_ENABLED: 'TRUE' }));
	});

	it('should load from files', async function() {
		const testPath = await makeTempFileWithContent('other');
		expect(parseEnv({ POSTGRES_USER_FILE: testPath }))
			.resolves.toHaveProperty('POSTGRES_USER', 'other');
	});

});
