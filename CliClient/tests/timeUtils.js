/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { asyncTest, fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const timeUtils = require('../../ReactNativeClient/lib/time-utils');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('timeUtils', function() {

	beforeEach(async (done) => {
		done();
	});

	it('should go back in time', asyncTest(async () => {
		let startDate = new Date('3 Aug 2020');
		let endDate = new Date('2 Aug 2020');

		expect(time.goBackInTime(startDate, 1, 'day')).toBe(endDate.getTime().toString());

		// We're always subtracting time from the beginning of the current period.
		startDate =  new Date('3 Aug 2020 07:30:20');
		expect(time.goBackInTime(startDate, 1, 'day')).toBe(endDate.getTime().toString());


		startDate = new Date('11 Aug 2020');
		endDate = new Date('9 Aug 2020'); // week start;
		expect(time.goBackInTime(startDate, 0, 'week')).toBe(endDate.getTime().toString());

		startDate = new Date('02 Feb 2020');
		endDate = new Date('01 Jan 2020');
		expect(time.goBackInTime(startDate, 1, 'month')).toBe(endDate.getTime().toString());

		startDate = new Date('19 September 2020');
		endDate = new Date('01 Jan 1997');
		expect(time.goBackInTime(startDate, 23, 'year')).toBe(endDate.getTime().toString());
	}));

	it('should go forward in time', asyncTest(async () => {
		let startDate = new Date('2 Aug 2020');
		let endDate = new Date('3 Aug 2020');

		expect(time.goForwardInTime(startDate, 1, 'day')).toBe(endDate.getTime().toString());

		startDate =  new Date('2 Aug 2020 07:30:20');
		expect(time.goForwardInTime(startDate, 1, 'day')).toBe(endDate.getTime().toString());


		startDate = new Date('9 Aug 2020');
		endDate = new Date('9 Aug 2020'); // week start;
		expect(time.goForwardInTime(startDate, 0, 'week')).toBe(endDate.getTime().toString());

		startDate = new Date('02 Jan 2020');
		endDate = new Date('01 Feb 2020');
		expect(time.goForwardInTime(startDate, 1, 'month')).toBe(endDate.getTime().toString());

		startDate = new Date('19 September 1997');
		endDate = new Date('01 Jan 2020');
		expect(time.goForwardInTime(startDate, 23, 'year')).toBe(endDate.getTime().toString());
	}));

});
