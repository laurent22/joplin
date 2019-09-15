const { asyncTest } = require('../testUtils');
const distDir = __dirname + '/../../dist';
const request = require('supertest');
const app = require(distDir + '/app/app');

describe('sessions', function() {

	it('should login and give back a session', asyncTest(async function() {
		const response = await request(app)
			.post('/sessions')
			.send({name: 'admin', password:'admin'});

		console.info('ZZZZZZZZ', response.body);
	}));

	it('should not login if password is wrong', asyncTest(async function() {
		let hasThrown = false;
		try {
			const response = await request(app)
				.post('/sessions')
				.send({name: 'admin', password:'bad'});
			console.info('ZZZZZZZZ', response.body);
		} catch (error) {
			hasThrown = true;
		}

		expect(hasThrown).toBe(true);


	}));

});
