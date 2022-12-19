import { Day, Month, Second } from './time';

describe('time', function() {

	it('should have correct interval durations', async function() {
		expect(Second).toBe(1000);
		expect(Day).toBe(86400000);
		expect(Month).toBe(2592000000);
	});

});
