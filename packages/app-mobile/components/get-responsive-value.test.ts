import getResponsiveValue from './get-responsive-value';
import { Dimensions } from 'react-native';

describe('getResponsiveValue', () => {
	beforeEach(() => {
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

		for (let i = 0; i < 12; i++) {
			result = getResponsiveValue(input);
			expect(result).toBe(correcOutput);
		}
	});

	test('Should return correct value when only sm value is specified (Array Syntax)', () => {
		const correcOutput = 40;
		const input = [40];
		let result: number;

		for (let i = 0; i < 12; i++) {
			result = getResponsiveValue(input);
			expect(result).toBe(correcOutput);
		}
	});

	test('Should return correct value when sm and md values are specified (Object Syntax)', () => {
		const input = { sm: 40, md: 70 };
		const correctOutputs = [40, 40, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70];
		let result: number;

		for (let i = 0; i < 12; i++) {
			result = getResponsiveValue(input);
			expect(result).toBe(correctOutputs[i]);
		}
	});

	test('Should return correct value when sm and md values are specified (Array Syntax)', () => {
		const input = [40, 70];
		const correctOutputs = [40, 40, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70];
		let result: number;

		for (let i = 0; i < 12; i++) {
			result = getResponsiveValue(input);
			expect(result).toBe(correctOutputs[i]);
		}
	});

	// test('Should return correct value when sm, md and lg values are specified (Object Syntax)', () => {
	// 	const input = { sm: 40, md: 70, lg: 90 };
	// 	const correctOutputs = [40, 40, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70];
	// 	let result: number;

	// 	for(let i = 0; i < 12; i++){
	// 		result = getResponsiveValue(input);
	// 		expect(result).toBe(correctOutputs[i]);
	// 	}
	// });
});
