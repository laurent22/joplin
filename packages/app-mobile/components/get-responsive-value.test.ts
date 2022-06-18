const getResponsiveValue = require('./get-responsive-value').default;

describe('getResponsiveValue', () => {
	test('Should return undefined if argument is an empty array', () => {
		const input: number[] = [];
		const result = getResponsiveValue(input);
		expect(result).toBe(undefined);
	});

	test('Should return undefined if argument is an empty object', () => {
		const input = {};
		const result = getResponsiveValue(input);
		expect(result).toBe(undefined);
	});

	// test('Should use mocked Dimensions.get() value', () => {
	// 	const result = getResponsiveValue([20]);
	// 	expect(result).toBe(50);
	// });

	test('Should return correct value when only sm value is specified', () => {
		const input = { sm: 40 };
		let result: number;

		for (let i = 0; i < 10; i++) {
			result = getResponsiveValue(1);
			expect(result).toBe(input.sm);
		}
	});
});
