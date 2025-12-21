import postprocessEditorOutput from './postprocessEditorOutput';

const normalizeHtmlString = (html: string) => {
	return html.replace(/\s+/g, ' ').trim();
};

describe('postprocessEditorOutput', () => {
	// Removing extra space around list items prevents extra space from being
	// added when converting from HTML to Markdown
	test('should remove extra paragraphs from around list items', () => {
		const doc = new DOMParser().parseFromString(`
			<body>
			<ul>
				<li><p>Test</p></li>
				<li>Test 2</li>
				<li><p></p><p>Test 3</p><p></p></li>
			</ul>
		`, 'text/html');

		const output = postprocessEditorOutput(doc.body);

		expect(
			normalizeHtmlString(output.querySelector('ul').outerHTML),
		).toBe(
			normalizeHtmlString(`
				<ul>
					<li>Test</li>
					<li>Test 2</li>
					<li>Test 3</li>
				</ul>
			`),
		);
	});

	// Removing extra space around checklist item content prevents extra space from being
	// added when converting from HTML to Markdown
	test('should remove wrapper paragraphs from around checklist items', () => {
		const doc = new DOMParser().parseFromString(`
			<body>
				<ul>
					<li><input><div><p>Should remove single wrapper paragraphs to avoid extra newlines when saving as Markdown.</p></div></li>
					<li><input><div><p>Should not remove paragraphs...</p><p>...when there are multiple.</p></div></li>
				</ul>
			</body>
		`, 'text/html');

		const output = postprocessEditorOutput(doc.body);

		expect(
			normalizeHtmlString(output.querySelector('ul').outerHTML),
		).toBe(
			normalizeHtmlString(`
				<ul>
					<li><input><span>Should remove single wrapper paragraphs to avoid extra newlines when saving as Markdown.</span></li>
					<li><input><div><p>Should not remove paragraphs...</p><p>...when there are multiple.</p></div></li>
				</ul>
			`),
		);
	});
});
