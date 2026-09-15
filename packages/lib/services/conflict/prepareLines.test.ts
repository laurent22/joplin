import prepareLines from './prepareLines';

describe('prepareLines', () => {

	test('should mark the rows of a table and nothing else', () => {
		const lines = ['intro', '| a | b |', '| - | - |', '| c | d |', 'outro'];

		const prepared = prepareLines(lines);

		expect(prepared.map(line => line.isTableRow)).toEqual([false, true, true, true, false]);
	});

	test('should tell the same text apart by where it sits', () => {
		const lines = ['| a | b |', '| - | - |', '', '```', '| a | b |', '```'];

		const prepared = prepareLines(lines);

		expect(prepared[0].isTableRow).toBe(true);
		expect(prepared[4].isTableRow).toBe(false);
		expect(prepared[0].comparisonText).not.toBe(prepared[0].text);
		expect(prepared[4].comparisonText).toBe(prepared[4].text);
	});

	test('should not treat pipe text without a delimiter row as a table', () => {
		const prepared = prepareLines(['| a | b |', '| c | d |']);

		expect(prepared.every(line => !line.isTableRow)).toBe(true);
	});

	test('should keep the original text whatever the line is', () => {
		const lines = ['| a  |  b |', '| -- | - |', '```', '|  x  |', '```'];

		expect(prepareLines(lines).map(line => line.text)).toEqual(lines);
	});
});
