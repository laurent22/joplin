require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const ArrayUtils = require('lib/ArrayUtils.js');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('Encryption', function() {

	beforeEach(async (done) => {
		done();
	});

	it('should remove array elements', async (done) => {
		let a = ['un', 'deux', 'trois'];
		a = ArrayUtils.removeElement(a, 'deux');

		expect(a[0]).toBe('un');
		expect(a[1]).toBe('trois');
		expect(a.length).toBe(2);

		a = ['un', 'deux', 'trois'];
		a = ArrayUtils.removeElement(a, 'not in there');
		expect(a.length).toBe(3);

		done();
	});

});