import * as React from 'react';
import { render } from '@testing-library/react';
import highlightSearchText from './searchHighlight';

describe('Config Search - Highlight Integration', () => {
	test('searchHighlight should properly render mark elements with case-insensitive matching', () => {
		const text = 'Synchronization';
		const query = 'sync';

		const result = highlightSearchText(text, query);
		const rendered = render(<>{result}</>);

		// Should find at least one mark element (the highlighted 'Sync' portion)
		const marks = rendered.container.querySelectorAll('mark');
		expect(marks.length).toBeGreaterThan(0);
	});

	test('searchHighlight should preserve text content while highlighting', () => {
		const text = 'Search and Find';
		const query = 'find';

		const result = highlightSearchText(text, query);
		const rendered = render(<>{result}</>);

		const combinedText = rendered.container.textContent;
		expect(combinedText).toBe(text);
	});

	test('searchHighlight with custom style should create mark elements', () => {
		const text = 'Find this';
		const query = 'find';
		const markStyle: React.CSSProperties = {
			backgroundColor: 'rgb(66 99 160)',
			color: 'white',
		};

		const result = highlightSearchText(text, query, markStyle);
		const rendered = render(<>{result}</>);

		const marks = rendered.container.querySelectorAll('mark');
		expect(marks.length).toBeGreaterThan(0);

		// Verify mark content contains the matched text
		const markContent = marks[0].textContent;
		expect(markContent?.toLowerCase()).toContain('find');
	});
});
