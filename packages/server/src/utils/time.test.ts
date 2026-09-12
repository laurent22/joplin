import { expectThrow } from './testing/testUtils';
import { Day, durationToMilliseconds, formatDurationToDays, Hour, Month, Second } from './time';

describe('time', () => {

	it('should have correct interval durations', () => {
		expect(Second).toBe(1000);
		expect(Day).toBe(86400000);
		expect(Month).toBe(2592000000);
	});

	it('should parse durations', async () => {
		const d = durationToMilliseconds('PT10S');
		expect(d).toBe(10000);
		await expectThrow(() => durationToMilliseconds('notaduration'));
	});

	it('should format millisecond durations to days', () => {
		expect(formatDurationToDays(Day)).toBe('1 day');
		expect(formatDurationToDays(Day + 12 * Hour)).toBe('1 day');
		expect(formatDurationToDays(Day + 26 * Hour)).toBe('2 days');
	});

});
