import { asyncTest, createUser, checkThrowAsync, beforeAllDb, afterAllDb, beforeEachDb } from '../utils/testUtils';
import SessionController from './SessionController';
import { ErrorForbidden } from '../utils/errors';

describe('SessionController', function() {

	beforeAll(async () => {
		await beforeAllDb('SessionController');
	});

	afterAll(async () => {
		await afterAllDb();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	it('should authenticate a user and give back a session', asyncTest(async function() {
		const user = await createUser(1);
		const controller = new SessionController();
		const session = await controller.authenticate(user.email, '123456');
		expect(!!session).toBe(true);
		expect(!!session.id).toBe(true);
		expect(!!session.user_id).toBe(true);
	}));

	it('should not give a session for invalid login', asyncTest(async function() {
		const user = await createUser(1);
		const controller = new SessionController();

		let error = await checkThrowAsync(async () => controller.authenticate(user.email, 'wrong'));
		expect(error instanceof ErrorForbidden).toBe(true);

		error = await checkThrowAsync(async () => controller.authenticate('wrong@wrong.com', '123456'));
		expect(error instanceof ErrorForbidden).toBe(true);
	}));

});
