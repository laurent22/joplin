const time = require('./time').default;

describe('timeUtils', () => {



	it('should go back in time', (async () => {
		let startDate = new Date('3 Aug 2020');
		let endDate = new Date('2 Aug 2020');

		expect(time.goBackInTime(startDate, 1, 'day')).toBe(endDate.getTime().toString());

		// We're always subtracting time from the beginning of the current period.
		startDate = new Date('3 Aug 2020 07:30:20');
		expect(time.goBackInTime(startDate, 1, 'day')).toBe(endDate.getTime().toString());

		// Note: this test randomly fails - https://github.com/laurent22/joplin/issues/3722

		// startDate = new Date('11 Aug 2020');
		// endDate = new Date('9 Aug 2020'); // week start;
		// expect(time.goBackInTime(startDate, 0, 'week')).toBe(endDate.getTime().toString());

		startDate = new Date('02 Feb 2020');
		endDate = new Date('01 Jan 2020');
		expect(time.goBackInTime(startDate, 1, 'month')).toBe(endDate.getTime().toString());

		startDate = new Date('19 September 2020');
		endDate = new Date('01 Jan 1997');
		expect(time.goBackInTime(startDate, 23, 'year')).toBe(endDate.getTime().toString());
	}));

	it('should go forward in time', (async () => {
		let startDate = new Date('2 Aug 2020');
		let endDate = new Date('3 Aug 2020');

		expect(time.goForwardInTime(startDate, 1, 'day')).toBe(endDate.getTime().toString());

		startDate = new Date('2 Aug 2020 07:30:20');
		expect(time.goForwardInTime(startDate, 1, 'day')).toBe(endDate.getTime().toString());


		// startDate = new Date('9 Aug 2020');
		// endDate = new Date('9 Aug 2020'); // week start;
		// expect(time.goForwardInTime(startDate, 0, 'week')).toBe(endDate.getTime().toString());

		startDate = new Date('02 Jan 2020');
		endDate = new Date('01 Feb 2020');
		expect(time.goForwardInTime(startDate, 1, 'month')).toBe(endDate.getTime().toString());

		startDate = new Date('19 September 1997');
		endDate = new Date('01 Jan 2020');
		expect(time.goForwardInTime(startDate, 23, 'year')).toBe(endDate.getTime().toString());
	}));

});
