import { prepareViewerLines } from './prepareViewerLines';

describe('prepareViewerLines', () => {

	test('should mark the rows of a table and nothing else', () => {
		const lines = ['intro', '| a | b |', '| - | - |', '| c | d |', 'outro'];

		const prepared = prepareViewerLines(lines);

		expect(prepared.map(line => line.isTableRow)).toEqual([false, true, true, true, false]);
	});

	test('should tell the same text apart by where it sits', () => {
		const lines = ['| a | b |', '| - | - |', '', '```', '| a | b |', '```'];

		const prepared = prepareViewerLines(lines);

		expect(prepared[0].isTableRow).toBe(true);
		expect(prepared[4].isTableRow).toBe(false);
		expect(prepared[0].comparisonText).not.toBe(prepared[0].text);
		expect(prepared[4].comparisonText).toBe(prepared[4].text);
	});

	test.each([
		['a shorter fence inside a longer one', ['````', '```js', '| --- | --- |', '| a | b |', '````']],
		['a different fence character', ['```', '~~~', '| --- | --- |', '| a | b |', '```']],
	])('should not end a code block at %s', (_label, lines) => {
		expect(prepareViewerLines(lines).every(line => !line.isTableRow)).toBe(true);
	});

	test('should end a code block at a longer closing fence', () => {
		const prepared = prepareViewerLines(['```', 'code', '`````', '| h | i |', '| - | - |']);

		expect(prepared.slice(3).every(line => line.isTableRow)).toBe(true);
	});

	test('should reject a delimiter row whose last cell is not a delimiter', () => {
		const prepared = prepareViewerLines(['| h | i |', '| --- | not-a-delimiter', '| a | b |']);

		expect(prepared.every(line => !line.isTableRow)).toBe(true);
	});

	test('should not treat pipe text without a delimiter row as a table', () => {
		const prepared = prepareViewerLines(['| a | b |', '| c | d |']);

		expect(prepared.every(line => !line.isTableRow)).toBe(true);
	});

	test('should keep the original text whatever the line is', () => {
		const lines = ['| a  |  b |', '| -- | - |', '```', '|  x  |', '```'];

		expect(prepareViewerLines(lines).map(line => line.text)).toEqual(lines);
	});
});
