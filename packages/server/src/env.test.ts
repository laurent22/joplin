import { afterAllTests, beforeAllDb, beforeEachDb, expectThrow } from './utils/testing/testUtils';
import { parseEnv } from './env';

describe('env', () => {

	beforeAll(async () => {
		await beforeAllDb('env');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	it('should parse env values', async () => {
		const result = parseEnv({
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

	it('should overrides default values', async () => {
		expect(parseEnv({}).POSTGRES_USER).toBe('joplin');
		expect(parseEnv({}, { POSTGRES_USER: 'other' }).POSTGRES_USER).toBe('other');
	});

	it('should validate values', async () => {
		await expectThrow(async () => parseEnv({ POSTGRES_PORT: 'notanumber' }));
		await expectThrow(async () => parseEnv({ MAILER_ENABLED: 'TRUE' }));
	});

});
