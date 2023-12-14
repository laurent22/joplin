import filterOcrText from './filterOcrText';

const testData: string[][] = [
	['— !',
		'',
	],

	[
		`- = = — ‘ =
—`,
		'',
	],

	['', ''],

	['   testing   ', 'testing'],

];

describe('filterOcrText', () => {

	it('should filter text', () => {
		for (const [input, expected] of testData) {
			expect(filterOcrText(input)).toBe(expected);
		}
	});

});
