const { asyncTest } = require('../testUtils');
// import app from './app';
import SessionController from '../../app/controllers/SessionController';

describe('sessions', function() {

	it('should login and give back a session', asyncTest(async function() {
		const controller = new SessionController();
		const response = await controller.authenticate('admin', 'admin')
		expect(!!response).toBe(true);
		expect(!!response.id).toBe(true);
		expect(!!response.user_id).toBe(true);
	}));

	// it('should not login if password is wrong', asyncTest(async function() {
	// 	let hasThrown = false;
	// 	try {
	// 		const response = await request(app)
	// 			.post('/sessions')
	// 			.send({name: 'admin', password:'bad'});
	// 		console.info('ZZZZZZZZ', response.body);
	// 	} catch (error) {
	// 		hasThrown = true;
	// 	}

	// 	expect(hasThrown).toBe(true);


	// }));

});


// const { asyncTest } = require('../testUtils');
// const distDir = __dirname + '/../../dist';
// const app = require(distDir + '/app/app');
// const SessionController = require(distDir + '/app/controllers/SessionController').default;

// describe('sessions', function() {

// 	it('should login and give back a session', asyncTest(async function() {
// 		const controller = new SessionController();
// 		const response = await controller.authenticate('admin', 'admin')
// 		expect(!!response).toBe(true);
// 		expect(!!response.id).toBe(true);
// 		expect(!!response.user_id).toBe(true);
// 	}));

// 	// it('should not login if password is wrong', asyncTest(async function() {
// 	// 	let hasThrown = false;
// 	// 	try {
// 	// 		const response = await request(app)
// 	// 			.post('/sessions')
// 	// 			.send({name: 'admin', password:'bad'});
// 	// 		console.info('ZZZZZZZZ', response.body);
// 	// 	} catch (error) {
// 	// 		hasThrown = true;
// 	// 	}

// 	// 	expect(hasThrown).toBe(true);


// 	// }));

// });
