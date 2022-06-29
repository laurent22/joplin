import getResponsiveValue from './getResponsiveValue';
import { Dimensions } from 'react-native';

describe('getResponsiveValue', () => {
	beforeEach(() => {
		// Mock the device width values returned by Dimensions.get() for better test coverage
		Dimensions.get = jest.fn()
			.mockReturnValueOnce({ width: 400 })
			.mockReturnValueOnce({ width: 480 })
			.mockReturnValueOnce({ width: 481 })
			.mockReturnValueOnce({ width: 600 })
			.mockReturnValueOnce({ width: 768 })
			.mockReturnValueOnce({ width: 769 })
			.mockReturnValueOnce({ width: 900 })
			.mockReturnValueOnce({ width: 1024 })
			.mockReturnValueOnce({ width: 1025 })
			.mockReturnValueOnce({ width: 1115 })
			.mockReturnValueOnce({ width: 1200 })
			.mockReturnValueOnce({ width: 1201 })
			.mockReturnValueOnce({ width: 1300 });
	});

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

	test('Should return correct value when only sm value is specified (Object Syntax)', () => {
		const correcOutput = 40;
		const input = { sm: 40 };
		let result: number;

		for (let i = 0; i < 13; i++) {
			result = getResponsiveValue(input);
			expect(result).toBe(correcOutput);
		}
	});

	test('Should return correct value when only sm value is specified (Array Syntax)', () => {
		const correcOutput = 40;
		const input = [40];
		let result: number;

		for (let i = 0; i < 13; i++) {
			result = getResponsiveValue(input);
			expect(result).toBe(correcOutput);
		}
	});

	test('Should return correct value when sm and md values are specified (Object Syntax)', () => {
		const input = { sm: 40, md: 70 };
		const correctOutputs = [40, 40, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70];
		let result: number;

		for (let i = 0; i < 13; i++) {
			result = getResponsiveValue(input);
			expect(result).toBe(correctOutputs[i]);
		}
	});

	test('Should return correct value when sm and md values are specified (Array Syntax)', () => {
		const input = [40, 70];
		const correctOutputs = [40, 40, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70];
		let result: number;

		for (let i = 0; i < 13; i++) {
			result = getResponsiveValue(input);
			expect(result).toBe(correctOutputs[i]);
		}
	});

	test('Should return correct value when sm, md and lg values are specified (Object Syntax)', () => {
		const input = { sm: 40, md: 70, lg: 90 };
		const correctOutputs = [40, 40, 70, 70, 70, 90, 90, 90, 90, 90, 90, 90, 90];
		let result: number;

		for (let i = 0; i < 13; i++) {
			result = getResponsiveValue(input);
			expect(result).toBe(correctOutputs[i]);
		}
	});

	test('Should return correct value when sm, md and lg values are specified (Array Syntax)', () => {
		const input = [40, 70, 90];
		const correctOutputs = [40, 40, 70, 70, 70, 90, 90, 90, 90, 90, 90, 90, 90];
		let result: number;

		for (let i = 0; i < 13; i++) {
			result = getResponsiveValue(input);
			expect(result).toBe(correctOutputs[i]);
		}
	});

	test('Should return correct value when sm, md, lg and xl values are specified (Object Syntax)', () => {
		const input = { sm: 40, md: 70, lg: 90, xl: 110 };
		const correctOutputs = [40, 40, 70, 70, 70, 90, 90, 90, 110, 110, 110, 110, 110];
		let result: number;

		for (let i = 0; i < 13; i++) {
			result = getResponsiveValue(input);
			expect(result).toBe(correctOutputs[i]);
		}
	});

	test('Should return correct value when sm, md, lg and xl values are specified (Array Syntax)', () => {
		const input = [40, 70, 90, 110];
		const correctOutputs = [40, 40, 70, 70, 70, 90, 90, 90, 110, 110, 110, 110, 110];
		let result: number;

		for (let i = 0; i < 13; i++) {
			result = getResponsiveValue(input);
			expect(result).toBe(correctOutputs[i]);
		}
	});

	test('Should return correct value when sm, md, lg, xl and xxl values are specified (Object Syntax)', () => {
		const input = { sm: 40, md: 70, lg: 90, xl: 110, xxl: 130 };
		const correctOutputs = [40, 40, 70, 70, 70, 90, 90, 90, 110, 110, 110, 130, 130];
		let result: number;

		for (let i = 0; i < 13; i++) {
			result = getResponsiveValue(input);
			expect(result).toBe(correctOutputs[i]);
		}
	});

	test('Should return correct value when sm, md, lg, xl and xxl values are specified (Array Syntax)', () => {
		const input = [40, 70, 90, 110, 130];
		const correctOutputs = [40, 40, 70, 70, 70, 90, 90, 90, 110, 110, 110, 130, 130];
		let result: number;

		for (let i = 0; i < 13; i++) {
			result = getResponsiveValue(input);
			expect(result).toBe(correctOutputs[i]);
		}
	});

	test('Should always return md value, if only md value is specified', () => {
		const input = { md: 70 };
		const correctOutputs = [70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70];
		let result: number;

		for (let i = 0; i < 13; i++) {
			result = getResponsiveValue(input);
			expect(result).toBe(correctOutputs[i]);
		}
	});

	test('Should always return lg value, if only lg value is specified', () => {
		const input = { lg: 90 };
		const correctOutputs = [90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90];
		let result: number;

		for (let i = 0; i < 13; i++) {
			result = getResponsiveValue(input);
			expect(result).toBe(correctOutputs[i]);
		}
	});

	test('Should always return xl value, if only xl value is specified', () => {
		const input = { xl: 110 };
		const correctOutputs = [110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110];
		let result: number;

		for (let i = 0; i < 13; i++) {
			result = getResponsiveValue(input);
			expect(result).toBe(correctOutputs[i]);
		}
	});

	test('Should always return xxl value, if only xxl value is specified', () => {
		const input = { xxl: 130 };
		const correctOutputs = [130, 130, 130, 130, 130, 130, 130, 130, 130, 130, 130, 130, 130];
		let result: number;

		for (let i = 0; i < 13; i++) {
			result = getResponsiveValue(input);
			expect(result).toBe(correctOutputs[i]);
		}
	});

	test('Should return correct value when sm and lg values are specified', () => {
		const input = { sm: 10, lg: 50 };
		const correctOutputs = [10, 10, 10, 10, 10, 50, 50, 50, 50, 50, 50, 50, 50];
		let result: number;

		for (let i = 0; i < 13; i++) {
			result = getResponsiveValue(input);
			expect(result).toBe(correctOutputs[i]);
		}
	});

	test('Should return correct value when sm and xl values are specified', () => {
		const input = { sm: 10, xl: 50 };
		const correctOutputs = [10, 10, 10, 10, 10, 10, 10, 10, 50, 50, 50, 50, 50];
		let result: number;

		for (let i = 0; i < 13; i++) {
			result = getResponsiveValue(input);
			expect(result).toBe(correctOutputs[i]);
		}
	});

	test('Should return correct values when sm and xxl values are specified', () => {
		const input = { sm: 10, xxl: 50 };
		const correctOutputs = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 50, 50];
		let result: number;

		for (let i = 0; i < 13; i++) {
			result = getResponsiveValue(input);
			expect(result).toBe(correctOutputs[i]);
		}
	});

	test('Should return correct values when md and lg values are specified', () => {
		const input = { md: 30, lg: 50 };
		const correctOutputs = [30, 30, 30, 30, 30, 50, 50, 50, 50, 50, 50, 50, 50];
		let result: number;

		for (let i = 0; i < 13; i++) {
			result = getResponsiveValue(input);
			expect(result).toBe(correctOutputs[i]);
		}
	});

	test('Should return correct values when md and xl values are specified', () => {
		const input = { md: 30, xl: 50 };
		const correctOutputs = [30, 30, 30, 30, 30, 30, 30, 30, 50, 50, 50, 50, 50];
		let result: number;

		for (let i = 0; i < 13; i++) {
			result = getResponsiveValue(input);
			expect(result).toBe(correctOutputs[i]);
		}
	});

	test('Should return correct values when md and xxl values are specified', () => {
		const input = { md: 30, xxl: 50 };
		const correctOutputs = [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 50, 50];
		let result: number;

		for (let i = 0; i < 13; i++) {
			result = getResponsiveValue(input);
			expect(result).toBe(correctOutputs[i]);
		}
	});

	test('Should return correct values when xl and xxl values are specified', () => {
		const input = { xl: 30, xxl: 50 };
		const correctOutputs = [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 50, 50];
		let result: number;

		for (let i = 0; i < 13; i++) {
			result = getResponsiveValue(input);
			expect(result).toBe(correctOutputs[i]);
		}
	});
});
