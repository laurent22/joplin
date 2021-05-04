import { modifyListLines } from './useCursorUtils';

describe('useCursorUtils', () => {
		
	let listWithDashes = `- item1
- item2
- item3`;
	
	let listNoDashes = `item1
item2
item3`;
	
	test('should remove "- " from beggining of each line of input string', () => {
		expect(JSON.stringify(modifyListLines(listWithDashes.split('\n'), 0, '- '))).toBe(JSON.stringify(listNoDashes.split('\n')));
	});
	
	test('should add "- " at the beggining of each line of the input string', () => {
		expect(JSON.stringify(modifyListLines(listNoDashes.split('\n'), 0, '- '))).toBe(JSON.stringify(listWithDashes.split('\n')));
	});
});
