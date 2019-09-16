const { asyncTest } = require('../testUtils');

import SessionController from '../../app/controllers/SessionController';
import { Session } from '../../app/db'

describe('sessions', function() {

	it('should login and give back a session', asyncTest(async function() {
		const controller = new SessionController();
		const session:Session = await controller.authenticate('admin', 'admin')
		expect(!!session).toBe(true);
		expect(!!session.id).toBe(true);
		expect(!!session.user_id).toBe(true);
	}));

});