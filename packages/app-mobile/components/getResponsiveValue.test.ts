import getResponsiveValue, { ValueMap } from './getResponsiveValue';
import { Dimensions } from 'react-native';

type testCase = [ ValueMap, number[] ];

const testCases: testCase[] = [
	// [ valueMap, outputs ]
	[{ sm: 40 }, [40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40]],
	[{ sm: 40, md: 70 }, [40, 40, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70]],
	[{ sm: 40, md: 70, lg: 90 }, [40, 40, 70, 70, 70, 90, 90, 90, 90, 90, 90, 90, 90]],
	[{ sm: 40, md: 70, lg: 90, xl: 110 }, [40, 40, 70, 70, 70, 90, 90, 90, 110, 110, 110, 110, 110]],
	[{ sm: 40, md: 70, lg: 90, xl: 110, xxl: 130 }, [40, 40, 70, 70, 70, 90, 90, 90, 110, 110, 110, 130, 130]],
	[{ md: 70 }, [70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70]],
	[{ lg: 90 }, [90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90]],
	[{ xl: 110 }, [110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110]],
	[{ xxl: 130 }, [130, 130, 130, 130, 130, 130, 130, 130, 130, 130, 130, 130, 130]],
	[{ sm: 10, lg: 50 }, [10, 10, 10, 10, 10, 50, 50, 50, 50, 50, 50, 50, 50]],
	[{ sm: 10, xl: 50 }, [10, 10, 10, 10, 10, 10, 10, 10, 50, 50, 50, 50, 50]],
	[{ sm: 10, xxl: 50 }, [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 50, 50]],
	[{ md: 30, lg: 50 }, [30, 30, 30, 30, 30, 50, 50, 50, 50, 50, 50, 50, 50]],
	[{ md: 30, xl: 50 }, [30, 30, 30, 30, 30, 30, 30, 30, 50, 50, 50, 50, 50]],
	[{ md: 30, xxl: 50 }, [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 50, 50]],
	[{ xl: 30, xxl: 50 }, [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 50, 50]],
];

describe('getResponsiveValue', () => {

	test('Should throw exception if value map is an empty object', () => {
		const input = {};
		expect(() => getResponsiveValue(input)).toThrow('valueMap cannot be an empty object!');
	});

	test('Should return correct values', () => {
		const mockReturnValues = [
			{ width: 400 },
			{ width: 480 },
			{ width: 481 },
			{ width: 600 },
			{ width: 768 },
			{ width: 769 },
			{ width: 900 },
			{ width: 1024 },
			{ width: 1025 },
			{ width: 1115 },
			{ width: 1200 },
			{ width: 1201 },
			{ width: 1300 },
		];

		for (let i = 0; i < testCases.length; i++) {
			const input = testCases[i][0];

			for (let j = 0; j < mockReturnValues.length; j++) {
				// Mock the device width values returned by Dimensions.get() using 'mockReturnValues' for better test coverage
				Dimensions.get = jest.fn().mockReturnValue(mockReturnValues[j]);
				const output: number = testCases[i][1][j];
				expect(getResponsiveValue(input)).toBe(output);
			}

		}
	});

});
