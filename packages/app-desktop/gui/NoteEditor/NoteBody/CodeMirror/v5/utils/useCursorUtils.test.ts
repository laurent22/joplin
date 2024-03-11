import { modifyListLines } from './useCursorUtils';

describe('useCursorUtils', () => {

	const listWithDashes = [
		'- item1',
		'- item2',
		'- item3',
	];

	const listWithNoPrefixes = [
		'item1',
		'item2',
		'item3',
	];

	const listWithNumbers = [
		'1. item1',
		'2. item2',
		'3. item3',
	];

	const listWithOnes = [
		'1. item1',
		'1. item2',
		'1. item3',
	];

	const listWithSomeNumbers = [
		'1. item1',
		'item2',
		'2. item3',
	];

	const numberedListWithEmptyLines = [
		'1. item1',
		'2. item2',
		'3. ',
		'4. item3',
	];

	const noPrefixListWithEmptyLines = [
		'item1',
		'item2',
		'',
		'item3',
	];

	test('should remove "- " from beginning of each line of input string', () => {
		expect(modifyListLines([...listWithDashes], NaN, '- ')).toStrictEqual(listWithNoPrefixes);
	});

	test('should add "- " at the beginning of each line of the input string', () => {
		expect(modifyListLines([...listWithNoPrefixes], NaN, '- ')).toStrictEqual(listWithDashes);
	});

	test('should remove "n. " at the beginning of each line of the input string', () => {
		expect(modifyListLines([...listWithNumbers], 4, '1. ')).toStrictEqual(listWithNoPrefixes);
	});

	test('should add "n. " at the beginning of each line of the input string', () => {
		expect(modifyListLines([...listWithNoPrefixes], 1, '1. ')).toStrictEqual(listWithNumbers);
	});

	test('should remove "1. " at the beginning of each line of the input string', () => {
		expect(modifyListLines([...listWithOnes], 2, '1. ')).toStrictEqual(listWithNoPrefixes);
	});

	test('should remove "n. " from each line that has it, and ignore' +
        ' lines which do not', () => {
		expect(modifyListLines([...listWithSomeNumbers], 2, '2. ')).toStrictEqual(listWithNoPrefixes);
	});

	test('should add numbers to each line including empty one', () => {
		expect(modifyListLines(noPrefixListWithEmptyLines, 1, '1. ')).toStrictEqual(numberedListWithEmptyLines);
	});
});
