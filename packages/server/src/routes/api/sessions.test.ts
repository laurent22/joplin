import { Session } from '../../services/database/types';
import routeHandler from '../../middleware/routeHandler';
import { beforeAllDb, afterAllTests, beforeEachDb, koaAppContext, createUserAndSession, models } from '../../utils/testing/testUtils';
import { AppContext } from '../../utils/types';
import config from '../../config';
import ldapLogin from '../../utils/ldapLogin';
import { ErrorForbidden } from '../../utils/errors';

jest.mock('../../utils/ldapLogin');

async function postSession(email: string, password: string): Promise<AppContext> {
	const context = await koaAppContext({
		request: {
			method: 'POST',
			url: '/api/sessions',
			body: {
				email: email,
				password: password,
			},
		},
	});

	await routeHandler(context);

	return context;
}

describe('api/sessions', () => {

	beforeAll(async () => {
		await beforeAllDb('api/sessions');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should login user', async () => {
		const { user, password } = await createUserAndSession(1, false);

		const context = await postSession(user.email, password);
		expect(context.response.status).toBe(200);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		expect(!!(context.response.body as any).id).toBe(true);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const session: Session = await models().session().load((context.response.body as any).id);
		expect(session.user_id).toBe(user.id);
	});

	test('should not login user with wrong password', async () => {
		const { user } = await createUserAndSession(1, false);

		{
			const context = await postSession(user.email, 'wrong');
			expect(context.response.status).toBe(403);
		}

		{
			const context = await postSession('wrong@wrong.com', '123456');
			expect(context.response.status).toBe(403);
		}

		{
			const context = await postSession('', '');
			expect(context.response.status).toBe(403);
		}
	});

	test('should not login with ldap if ldapLogin returns null and user data is wrong', async () => {

		const { user } = await createUserAndSession(1, false);

		(ldapLogin as jest.Mock).mockResolvedValue(null);

		config().ldap[0] = {
			enabled: true,
			userCreation: true,
			host: '',
			mailAttribute: '',
			fullNameAttribute: '',
			baseDN: '',
			bindDN: '',
			bindPW: '',
			tlsCaFile: '',
		};

		{
			const context = await postSession(user.email, 'wrong');
			expect(ldapLogin).toHaveBeenCalled();
			expect(context.response.status).toBe(403);
		}

		{
			const context = await postSession('wrong@wrong.com', '123456');
			expect(ldapLogin).toHaveBeenCalled();
			expect(context.response.status).toBe(403);
		}

		{
			const context = await postSession('', '');
			expect(ldapLogin).toHaveBeenCalled();
			expect(context.response.status).toBe(403);
		}

	});

	test('should fallback to local authentication if ldapLogin returns null but login data matches local user', async () => {

		const { user, password } = await createUserAndSession(1, false);

		(ldapLogin as jest.Mock).mockResolvedValue(null);

		config().ldap[0] = {
			enabled: true,
			userCreation: true,
			host: '',
			mailAttribute: '',
			fullNameAttribute: '',
			baseDN: '',
			bindDN: '',
			bindPW: '',
			tlsCaFile: '',
		};

		const context = await postSession(user.email, password);

		expect(ldapLogin).toHaveBeenCalled();
		expect(context.response.status).toBe(200);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		expect(!!(context.response.body as any).id).toBe(true);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const session: Session = await models().session().load((context.response.body as any).id);
		expect(session.user_id).toBe(user.id);

	});

	test('should login ldap user if ldapLogin returns user', async () => {

		const { user, password } = await createUserAndSession(1, false);

		config().ldap[0] = {
			enabled: true,
			userCreation: true,
			host: '',
			mailAttribute: '',
			fullNameAttribute: '',
			baseDN: '',
			bindDN: '',
			bindPW: '',
			tlsCaFile: '',
		};

		(ldapLogin as jest.Mock).mockResolvedValue(user);

		const context = await postSession(user.email, password);

		expect(ldapLogin).toHaveBeenCalled();
		expect(context.response.status).toBe(200);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		expect(!!(context.response.body as any).id).toBe(true);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const session: Session = await models().session().load((context.response.body as any).id);
		expect(session.user_id).toBe(user.id);

	});

	test('should not login if ldapLogin returns ForbiddenError', async () => {

		config().ldap[0] = {
			enabled: true,
			userCreation: true,
			host: '',
			mailAttribute: '',
			fullNameAttribute: '',
			baseDN: '',
			bindDN: '',
			bindPW: '',
			tlsCaFile: '',
		};

		(ldapLogin as jest.Mock).mockImplementationOnce(() => {
			throw new ErrorForbidden('Test Error');
		});

		const context = await postSession('wrong@wrong.com', '123456');
		expect(ldapLogin).toHaveBeenCalled();
		expect(context.response.status).toBe(403);


	});

	test('should not login if ldapLogin returns Error', async () => {

		config().ldap[0] = {
			enabled: true,
			userCreation: true,
			host: '',
			mailAttribute: '',
			fullNameAttribute: '',
			baseDN: '',
			bindDN: '',
			bindPW: '',
			tlsCaFile: '',
		};

		(ldapLogin as jest.Mock).mockImplementationOnce(() => {
			throw new Error('Test Error');
		});

		const context = await postSession('wrong@wrong.com', '123456');
		expect(ldapLogin).toHaveBeenCalled();
		expect(context.response.status).toBe(500);

	});

});
