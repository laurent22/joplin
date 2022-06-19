'use strict';
const getResponsiveValue = require('./get-responsive-value').default;
jest.mock('react-native', () => {
	return {
		__esModule: true,
		Dimensions: {
			get: jest.fn()
				.mockReturnValueOnce({ width: 400 }) // Screen width returned for 1st call of getResponsiveValue()
				.mockReturnValueOnce({ width: 400 }) //       ...
				.mockReturnValueOnce({ width: 400 }) //       ...
				.mockReturnValueOnce({ width: 480 }) //       ...
				.mockReturnValueOnce({ width: 481 }) //       ...
				.mockReturnValueOnce({ width: 600 }) //       ...
				.mockReturnValueOnce({ width: 768 }) //       ...
				.mockReturnValueOnce({ width: 769 }) //       ...
				.mockReturnValueOnce({ width: 900 }) //       ...
				.mockReturnValueOnce({ width: 1024 }) //       ...
				.mockReturnValueOnce({ width: 1025 }) //       ...
				.mockReturnValueOnce({ width: 1200 }) //       ...
				.mockReturnValueOnce({ width: 1201 }) //       ...
				.mockReturnValueOnce({ width: 1300 }), // Screen width returned for 12th call of getResponsiveValue()
		},
	};
});
describe('getResponsiveValue', () => {
	test('Should return undefined if argument is an empty array', () => {
		const input = [];
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
		let result;
		for (let i = 0; i < 10; i++) {
			result = getResponsiveValue(1);
			expect(result).toBe(input.sm);
		}
	});
});
// # sourceMappingURL=get-responsive-value.test.js.map
