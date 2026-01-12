import { execRequest } from '../../utils/testing/apiUtils';
import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession, models, expectHttpError } from '../../utils/testing/testUtils';
import { totp } from 'otplib';
import * as crypto from '../../utils/crypto';
import { ErrorBadRequest } from '../../utils/errors';

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
		const { session, user } = await createUserAndSession(1, true);

		const totpCheck = jest.spyOn(totp, 'check');
		totpCheck.mockReturnValue(true);

		const cryptoEncrypt = jest.spyOn(crypto, 'encryptMFASecret');
		cryptoEncrypt.mockReturnValue('encrypt-totp-secret');

		await execRequest(session.id, 'POST', 'mfa/me', { totpSecret: 'totp-secret-in-base-32', confirmCode: '0123456' }, null);
		expect((await models().user().load(user.id)).totp_secret).toBe('encrypt-totp-secret');
	});

	test('should redirect user to the same page with same totpSecret if confirmCode is not correct', async () => {
		const { session } = await createUserAndSession(1, true);

		const totpCheck = jest.spyOn(totp, 'check');
		totpCheck.mockReturnValue(false);

		try {
			await execRequest(session.id, 'POST', 'mfa/me', { totpSecret: 'totp-secret-in-base-32', confirmCode: '0123456' }, null);
		} catch (error) {
			expect(error.toString().includes('totp-secret-in-base-32')).toBe(true);
		}
	});

	test('should not save totp_secret if totp check is invalid', async () => {
		const { session, user } = await createUserAndSession(1, true);

		const totpCheck = jest.spyOn(totp, 'check');
		totpCheck.mockReturnValue(false);

		await expectHttpError(async () => await execRequest(session.id, 'POST', 'mfa/me', { totpSecret: 'totp-secret-in-base-32', confirmCode: '0123456' }, null), 403);

		expect((await models().user().load(user.id)).totp_secret).toBe('');
	});

	test('should create recovery codes when MFA is enabled', async () => {
		const { session, user } = await createUserAndSession(1, true);

		const totpCheck = jest.spyOn(totp, 'check');
		totpCheck.mockReturnValue(true);

		const cryptoEncrypt = jest.spyOn(crypto, 'encryptMFASecret');
		cryptoEncrypt.mockReturnValue('encrypt-totp-secret');

		await execRequest(session.id, 'POST', 'mfa/me', { totpSecret: 'totp-secret-in-base-32', confirmCode: '0123456' }, null);

		const recoveryCodes = await models().recoveryCode().loadByUserId(user.id);

		expect(recoveryCodes.length).toBe(10);
	});

	test('should throw Bad Request error if password is empty when MFA is being disabled', async () => {
		const { session, user } = await createUserAndSession(1, true);

		await models().user().enableMFA(user.id, 'totp-secret', session.id);

		await expectHttpError(
			async () => execRequest(session.id, 'POST', 'mfa/me', { formType: 'disableMFA', password: undefined }, null),
			ErrorBadRequest.httpCode,
		);

		const dbUser = await models().user().load(user.id, { fields: ['totp_secret'] });
		expect(dbUser.totp_secret).not.toBe('');
	});

});
