import markdownUtils from './markdownUtils';

describe('Should detect list items', () => {
	test('should detect `- lorem ipsum` as list item ', () => {
		expect(markdownUtils.isListItem('- lorem ipsum')).toBe(true);
	});
	test('should detect `+ lorem ipsum` as list item ', () => {
		expect(markdownUtils.isListItem('+ lorem ipsum')).toBe(true);
	});
	test('should detect `* lorem ipsum` as list item ', () => {
		expect(markdownUtils.isListItem('* lorem ipsum')).toBe(true);
	});

	// ordered list
	test('should detect `1. lorem ipsum` as list item ', () => {
		expect(markdownUtils.isListItem('1. lorem ipsum')).toBe(true);
	});
	test('should detect `1) lorem ipsum` as list item ', () => {
		expect(markdownUtils.isListItem('1) lorem ipsum')).toBe(true);
	});
	// checkbox list
	test('should detect `+ [x] lorem ipsum` as list item ', () => {
		expect(markdownUtils.isListItem('+ [x] lorem ipsum')).toBe(true);
	});

	// ordered list
	test('should NOT detect `-lorem ipsum` as list item ', () => {
		expect(markdownUtils.isListItem('-lorem ipsum')).toBe(false);
	});
	test('should NOT detect `+lorem ipsum` as list item ', () => {
		expect(markdownUtils.isListItem('+lorem ipsum')).toBe(false);
	});
	test('should NOT detect `*lorem ipsum` as list item ', () => {
		expect(markdownUtils.isListItem('*lorem ipsum')).toBe(false);
	});

	// ordered list
	test('should NOT detect `1.lorem ipsum` as list item ', () => {
		expect(markdownUtils.isListItem('1.lorem ipsum')).toBe(false);
	});
	test('should NOT detect `1)lorem ipsum` as list item ', () => {
		expect(markdownUtils.isListItem('1)lorem ipsum')).toBe(false);
	});

	test('should NOT detect `+[x]lorem ipsum` as list item ', () => {
		expect(markdownUtils.isListItem('+[x]lorem ipsum')).toBe(false);
	});
	// Empty list detection
	test('should detect `- ` as empty list item ', () => {
		expect(markdownUtils.isEmptyListItem('- ')).toBe(true);
	});
	test('should detect `+ ` as empty list item ', () => {
		expect(markdownUtils.isEmptyListItem('+ ')).toBe(true);
	});
	test('should detect `* ` as empty list item ', () => {
		expect(markdownUtils.isEmptyListItem('* ')).toBe(true);
	});

	// ordered list
	test('should detect `1. ` as empty list item ', () => {
		expect(markdownUtils.isEmptyListItem('1. ')).toBe(true);
	});
	test('should detect `1) ` as empty list item ', () => {
		expect(markdownUtils.isEmptyListItem('1) ')).toBe(true);
	});
	// checkbox list
	test('should detect `+ [x] ` as empty list item ', () => {
		expect(markdownUtils.isEmptyListItem('+ [x] ')).toBe(true);
	});

	// unordered list
	test('should NOT detect `-` as empty list item ', () => {
		expect(markdownUtils.isEmptyListItem('-')).toBe(false);
	});
	test('should NOT detect `+` as empty list item ', () => {
		expect(markdownUtils.isEmptyListItem('+')).toBe(false);
	});
	test('should NOT detect `*` as empty list item ', () => {
		expect(markdownUtils.isEmptyListItem('*')).toBe(false);
	});

	// ordered list
	test('should NOT detect `1.` as empty list item ', () => {
		expect(markdownUtils.isEmptyListItem('1.')).toBe(false);
	});
	test('should NOT detect `1)` as empty list item ', () => {
		expect(markdownUtils.isEmptyListItem('1)')).toBe(false);
	});
	// checkbox list
	test('should NOT detect `+ [x]` as empty list item ', () => {
		expect(markdownUtils.isEmptyListItem('+ [x]')).toBe(false);
	});
});
