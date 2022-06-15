import getResponsiveValue from './get-responsive-value';

describe('getResponsiveValue', () => {
	test('Should return undefined if argument is empty, or is not an array or object', () => {
		const result = getResponsiveValue([]);

		expect(result).toBe(undefined);
	});
});
