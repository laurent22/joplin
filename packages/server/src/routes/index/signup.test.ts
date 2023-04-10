import config from '../../config';
import { AccountType } from '../../models/UserModel';
import { getCanShareFolder, getMaxItemSize } from '../../models/utils/user';
import { MB } from '../../utils/bytes';
import { cookieGet } from '../../utils/cookies';
import { execRequestC } from '../../utils/testing/apiUtils';
import { beforeAllDb, afterAllTests, beforeEachDb, models } from '../../utils/testing/testUtils';
import uuidgen from '../../utils/uuidgen';
import { FormUser } from './signup';

describe('index_signup', () => {

	beforeAll(async () => {
		await beforeAllDb('index_signup');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should create a new account', async () => {
		const password = uuidgen();
		const formUser: FormUser = {
			full_name: 'Toto',
			email: 'toto@example.com',
			password: password,
			password2: password,
		};

		// First confirm that it doesn't work if sign up is disabled
		{
			config().signupEnabled = false;
			await execRequestC('', 'POST', 'signup', formUser);
			expect(await models().user().loadByEmail('toto@example.com')).toBeFalsy();
		}

		config().signupEnabled = true;
		const context = await execRequestC('', 'POST', 'signup', formUser);

		// Check that the user has been created
		const user = await models().user().loadByEmail('toto@example.com');
		expect(user).toBeTruthy();
		expect(user.account_type).toBe(AccountType.Basic);
		expect(user.email_confirmed).toBe(0);
		expect(getCanShareFolder(user)).toBe(0);
		expect(getMaxItemSize(user)).toBe(10 * MB);

		// Check that the user is logged in
		const session = await models().session().load(cookieGet(context, 'sessionId'));
		expect(session.user_id).toBe(user.id);
	});

});
