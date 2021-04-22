import { modifyListLines } from './useCursorUtils';

describe('Check list item modification', () => {
	const num = 0;
	let lineInitial = `- item1
- item2
- item3`;
	let lineFinal = `item1
item2
item3`;
	test('should remove "- " from beggining  of each line of input string', () => {
		expect(JSON.stringify(modifyListLines(lineInitial.split('\n'), num, '- '))).toBe(JSON.stringify(lineFinal.split('\n')));
	});
	test('should add "- " at the beggining of each line of the input string', () => {
		// swap input and expected output
		const temp = lineInitial;
		lineInitial = lineFinal;
		lineFinal = temp;
		expect(JSON.stringify(modifyListLines(lineInitial.split('\n'), num, '- '))).toBe(JSON.stringify(lineFinal.split('\n')));
	});
});
