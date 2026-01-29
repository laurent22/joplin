import randomId from './randomId';

describe('randomId', () => {
	test('should generate a 32-character alphanumeric ID', () => {
		expect(
			randomId((_low, high) => high - 1)(),
		).toBe('ffffffffffffffffffffffffffffffff');
		expect(
			randomId((low, _high) => low)(),
		).toBe('00000000000000000000000000000000');
	});
});
