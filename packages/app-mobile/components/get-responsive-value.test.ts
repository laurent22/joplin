import getResponsiveValue from './get-responsive-value';

describe('getResponsiveValue', () => {
	test('Should return undefined if argument is an empty array', () => {
		const result = getResponsiveValue([]);
		expect(result).toBe(undefined);
	});

	test('Should return undefined if argument is an empty object', () => {
		const result = getResponsiveValue({});
		expect(result).toBe(undefined);
	});
});
