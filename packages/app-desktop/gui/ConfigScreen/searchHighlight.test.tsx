import * as React from 'react';
import highlightSearchText from './searchHighlight';

describe('searchHighlight', () => {
	const countMarks = (result: React.ReactNode[]): number => {
		return result.filter((element) => React.isValidElement(element) && (element as React.ReactElement).type === 'mark').length;
	};

	test('highlights all matching occurrences (case-insensitive)', () => {
		const text = 'Synchronization settings for sync behavior';
		const query = 'sync';

		const result = highlightSearchText(text, query) as React.ReactNode[];
		const markCount = countMarks(result);

		expect(markCount).toBe(2);
	});

	test('returns original text when query is empty', () => {
		const text = 'Some test text';
		const resultEmpty = highlightSearchText(text, '');

		expect(resultEmpty).toBe(text);
	});

	test('returns original text when query is whitespace only', () => {
		const text = 'Some test text';
		const resultWhitespace = highlightSearchText(text, '   ');

		expect(resultWhitespace).toBe(text);
	});

	test('returns original text when text is empty', () => {
		const result = highlightSearchText('', 'query');

		expect(result).toBe('');
	});

	test('handles special regex characters in query', () => {
		const text = 'Test (nested) [brackets] and {braces}';
		const query = '(nested)';

		const result = highlightSearchText(text, query) as React.ReactNode[];
		const markCount = countMarks(result);

		expect(markCount).toBe(1);
	});
});
