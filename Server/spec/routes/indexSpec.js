const { asyncTest } = require('../testUtils');
const distDir = __dirname + '/../../dist';
const request = require('supertest');
const app = require(distDir + '/app/app');

describe('index', function() {

	it('should return something', asyncTest(async function() {
		const response = await request(app).get('/');
		console.info(response.body);

		// .expect('Content-Type', /json/)
		// .expect(200)
		// .then(function(response) {
		//   console.info(response.body);
		// });
	}));

});
