import * as React from 'react';
import { render } from '@testing-library/react';
import highlightSearchText from './searchHighlight';

describe('searchHighlight', () => {
	const countMarks = (result: React.ReactNode[]): number => {
		return result.filter((element) => React.isValidElement(element) && (element as React.ReactElement).type === 'mark').length;
	};

	it('should highlight all matching occurrences (case-insensitive)', () => {
		const text = 'Synchronization settings for sync behavior';
		const query = 'sync';

		const result = highlightSearchText(text, query) as React.ReactNode[];
		const markCount = countMarks(result);

		expect(markCount).toBe(2);
	});

	it('should return original text when query is empty', () => {
		const text = 'Some test text';
		const resultEmpty = highlightSearchText(text, '');

		expect(resultEmpty).toBe(text);
	});

	it('should return original text when query is whitespace only', () => {
		const text = 'Some test text';
		const resultWhitespace = highlightSearchText(text, '   ');

		expect(resultWhitespace).toBe(text);
	});

	it('should return original text when input text is empty', () => {
		const result = highlightSearchText('', 'query');

		expect(result).toBe('');
	});

	it('should handle special regex characters in query', () => {
		const text = 'Test (nested) [brackets] and {braces}';
		const query = '(nested)';

		const result = highlightSearchText(text, query) as React.ReactNode[];
		const markCount = countMarks(result);

		expect(markCount).toBe(1);
	});

	it('should render mark elements for case-insensitive matches', () => {
		const result = highlightSearchText('Synchronization', 'sync');
		const rendered = render(<>{result}</>);

		const marks = rendered.container.querySelectorAll('mark');
		expect(marks.length).toBeGreaterThan(0);
	});

	it('should preserve full text content when highlighting', () => {
		const text = 'Search and Find';
		const result = highlightSearchText(text, 'find');
		const rendered = render(<>{result}</>);

		expect(rendered.container.textContent).toBe(text);
	});

	it('should render highlighted mark for matches', () => {
		const result = highlightSearchText('Find this', 'find');
		const rendered = render(<>{result}</>);

		const marks = rendered.container.querySelectorAll('mark');
		expect(marks.length).toBeGreaterThan(0);
		expect(marks[0].textContent?.toLowerCase()).toContain('find');
	});
});
