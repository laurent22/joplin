import { Day, Month, Second } from './time';

describe('time', () => {

	it('should have correct interval durations', async () => {
		expect(Second).toBe(1000);
		expect(Day).toBe(86400000);
		expect(Month).toBe(2592000000);
	});

});
