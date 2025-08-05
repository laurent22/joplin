import preprocessEditorInput from './preprocessEditorInput';

describe('preprocessEditorInput', () => {
	test.each([
		{
			label: 'Should add the correct original markup for a multi-line paragraph',
			originalHtml: `<p
					class="maps-to-line"
					source-line="0"
					source-line-end="2"
				>Test<br>Testing...</p>`,
			source: 'Test<br>Testing...\n\nTest!',
			expected: (dom: Document) => {
				expect(
					dom.querySelector('p').getAttribute('data-original-markup'),
				).toBe('Test<br>Testing...\n');
			},
		},
		{
			label: 'Should add the correct original markup for a list',
			// Joplin lists don't have toplevel source-line and source-line-end attributes.
			// As such, preprocessEditorInput should fetch this information from the list items.
			originalHtml: `<ul>
				<li class="maps-to-line" source-line="0" source-line-end="1">Testing...</li>
				<li class="maps-to-line" source-line="1" source-line-end="2">Test.</li>
			</ul>`,
			source: '- Testing...\n- Test',
			expected: (dom: Document) => {
				expect(
					dom.querySelector('ul').getAttribute('data-original-markup'),
				).toBe('- Testing...\n- Test');
			},
		},
	])('should add a "data-original-markup" attribute to toplevel nodes: $label', ({ originalHtml, source, expected }) => {
		const dom = new DOMParser().parseFromString(originalHtml, 'text/html');
		preprocessEditorInput(dom, source);
		expected(dom);
	});
});
