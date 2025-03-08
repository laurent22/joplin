import { formatMsToDurationCompat, Hour, Minute, Second } from './time';

describe('time', () => {
	test.each([
		[0, '0:00'],
		[2500, '0:02'],
		[Minute * 3, '3:00'],
		[Hour + Minute * 3, '63:00'],
		[Hour + Minute * 3 + Second, '63:01'],
	])('should support formatting durations', (input, expected) => {
		expect(formatMsToDurationCompat(input)).toBe(expected);
	});
});
