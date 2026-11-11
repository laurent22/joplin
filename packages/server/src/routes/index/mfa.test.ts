import { execRequest } from '../../utils/testing/apiUtils';
import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession, models, expectHttpError } from '../../utils/testing/testUtils';
import { totp } from 'otplib';
import * as crypto from '../../utils/crypto';
import { ErrorBadRequest, ErrorForbidden, ErrorUnprocessableEntity } from '../../utils/errors';

// Secrets in the format the server generates: 32 base 32 characters
const validTotpSecret = 'A'.repeat(32);
const otherValidTotpSecret = 'B'.repeat(32);

describe('index/mfa', () => {

	beforeAll(async () => {
		await beforeAllDb('index_mfa', {
			envValues: {
				MFA_ENCRYPTION_KEY: 'b73e50cd8970ed5eefb980d860c8406eb8f6519a90ce9c8f9f2b2b73661a5ab21',
			},
		});
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should load a different totp_secret on every new page load', async () => {
		const { session } = await createUserAndSession(1, true);

		const regex = /<code>(\w.*?)<\/code>/;

		const response1 = await execRequest(session.id, 'GET', 'mfa/me');
		const totpSecret1 = response1.toString().match(regex)[1];

		const response2 = await execRequest(session.id, 'GET', 'mfa/me');
		const totpSecret2 = response2.toString().match(regex)[1];
		expect(totpSecret1).not.toBe(totpSecret2);
	});

	test('should be able to register MFA', async () => {
		const { session, user, password } = await createUserAndSession(1, true);

		const totpCheck = jest.spyOn(totp, 'check');
		totpCheck.mockReturnValue(true);

		const cryptoEncrypt = jest.spyOn(crypto, 'encryptMFASecret');
		cryptoEncrypt.mockReturnValue('encrypt-totp-secret');

		await execRequest(session.id, 'POST', 'mfa/me', { totpSecret: validTotpSecret, confirmCode: '012345', confirmCode2: '012345', password }, null);
		expect((await models().user().load(user.id)).totp_secret).toBe('encrypt-totp-secret');
	});

	test('should redirect user to the same page with same totpSecret if confirmCode is not correct', async () => {
		const { session } = await createUserAndSession(1, true);

		const totpCheck = jest.spyOn(totp, 'check');
		totpCheck.mockReturnValue(false);

		try {
			await execRequest(session.id, 'POST', 'mfa/me', { totpSecret: validTotpSecret, confirmCode: '012345', confirmCode2: '012345' }, null);
		} catch (error) {
			expect(error.toString().includes(validTotpSecret)).toBe(true);
		}
	});

	test('should not save totp_secret if totp check is invalid', async () => {
		const { session, user, password } = await createUserAndSession(1, true);

		const totpCheck = jest.spyOn(totp, 'check');
		totpCheck.mockReturnValue(false);

		await expectHttpError(async () => await execRequest(session.id, 'POST', 'mfa/me', { totpSecret: validTotpSecret, confirmCode: '012345', confirmCode2: '012345', password }, null), 403);

		expect((await models().user().load(user.id)).totp_secret).toBe('');
	});

	test('should create recovery codes when MFA is enabled', async () => {
		const { session, user, password } = await createUserAndSession(1, true);

		const totpCheck = jest.spyOn(totp, 'check');
		totpCheck.mockReturnValue(true);

		const cryptoEncrypt = jest.spyOn(crypto, 'encryptMFASecret');
		cryptoEncrypt.mockReturnValue('encrypt-totp-secret');

		await execRequest(session.id, 'POST', 'mfa/me', { totpSecret: validTotpSecret, confirmCode: '012345', confirmCode2: '012345', password }, null);

		const recoveryCodes = await models().recoveryCode().loadByUserId(user.id);

		expect(recoveryCodes.length).toBe(10);
	});

	test.each([
		['a number instead of a secret', { totpSecret: 300000000, confirmCode: '012345', confirmCode2: '012345' }],
		['a secret in the wrong format', { totpSecret: 'not-base-32', confirmCode: '012345', confirmCode2: '012345' }],
		['codes in the wrong format', { totpSecret: validTotpSecret, confirmCode: '12', confirmCode2: { a: 1 } }],
	])('should reject %s when enabling MFA', async (_case, fields) => {
		const { session, user, password } = await createUserAndSession(1, true);

		await expectHttpError(async () => execRequest(session.id, 'POST', 'mfa/me', { ...fields, password }, null), ErrorBadRequest.httpCode);
		expect((await models().user().load(user.id)).totp_secret).toBe('');
	});

	test('should not disable MFA if the password is empty', async () => {
		const { session, user } = await createUserAndSession(1, true);

		await models().user().enableMFA(user.id, 'totp-secret', session.id);

		await expectHttpError(
			async () => execRequest(session.id, 'POST', 'mfa/me', { formType: 'disableMFA', password: undefined }, null),
			ErrorUnprocessableEntity.httpCode,
		);

		const dbUser = await models().user().load(user.id, { fields: ['totp_secret'] });
		expect(dbUser.totp_secret).not.toBe('');
	});

	test.each([
		['without the password', false, ErrorUnprocessableEntity.httpCode],
		['when MFA is already enabled', true, ErrorForbidden.httpCode],
	])('should not enable MFA %s', async (_case, alreadyEnabled, expectedHttpCode) => {
		const { session, user, password } = await createUserAndSession(1, true);
		if (alreadyEnabled) await models().user().enableMFA(user.id, 'totp-secret', session.id);
		const totpSecretBefore = (await models().user().load(user.id, { fields: ['totp_secret'] })).totp_secret;

		jest.spyOn(totp, 'check').mockReturnValue(true);

		await expectHttpError(async () => execRequest(session.id, 'POST', 'mfa/me', {
			totpSecret: otherValidTotpSecret,
			confirmCode: '012345', confirmCode2: '012345',
			password: alreadyEnabled ? password : undefined,
		}, null), expectedHttpCode);

		expect((await models().user().load(user.id, { fields: ['totp_secret'] })).totp_secret).toBe(totpSecretBefore);
	});

});
