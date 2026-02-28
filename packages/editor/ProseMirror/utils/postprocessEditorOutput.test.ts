import postprocessEditorOutput from './postprocessEditorOutput';

const normalizeHtmlString = (html: string) => {
	return html.replace(/\s+/g, ' ').trim();
};

describe('postprocessEditorOutput', () => {
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

	test('should remove wrapper paragraph from list items with nested lists', () => {
		const doc = new DOMParser().parseFromString(`
			<body>
				<ul>
					<li><p>Parent item</p><ul><li><p>Nested item</p></li></ul></li>
					<li><p>After nested</p></li>
				</ul>
			</body>
		`, 'text/html');

		const output = postprocessEditorOutput(doc.body);

		expect(
			normalizeHtmlString(output.querySelector('ul').outerHTML),
		).toBe(
			normalizeHtmlString(`
				<ul>
					<li>Parent item<ul><li>Nested item</li></ul></li>
					<li>After nested</li>
				</ul>
			`),
		);
	});

	test('should preserve multiple paragraphs in list items with nested lists', () => {
		const doc = new DOMParser().parseFromString(`
			<body>
				<ul>
					<li><p>First paragraph</p><p>Second paragraph</p><ul><li><p>Nested</p></li></ul></li>
				</ul>
			</body>
		`, 'text/html');

		const output = postprocessEditorOutput(doc.body);

		expect(
			normalizeHtmlString(output.querySelector('ul').outerHTML),
		).toBe(
			normalizeHtmlString(`
				<ul>
					<li><p>First paragraph</p><p>Second paragraph</p><ul><li>Nested</li></ul></li>
				</ul>
			`),
		);
	});

	test('should preserve non-consecutive paragraphs separated by nested lists', () => {
		const doc = new DOMParser().parseFromString(`
			<body>
				<ul>
					<li><p>Before</p><ul><li><p>Nested</p></li></ul><p>After</p></li>
				</ul>
			</body>
		`, 'text/html');

		const output = postprocessEditorOutput(doc.body);

		expect(
			normalizeHtmlString(output.querySelector('ul').outerHTML),
		).toBe(
			normalizeHtmlString(`
				<ul>
					<li><p>Before</p><ul><li>Nested</li></ul><p>After</p></li>
				</ul>
			`),
		);
	});

	test('should remove wrapper paragraph from checklist items with nested lists', () => {
		const doc = new DOMParser().parseFromString(`
			<body>
				<ul>
					<li><input><div><p>Parent</p><ul><li><input><div><p>Nested</p></div></li></ul></div></li>
					<li><input><div><p>After nested</p></div></li>
				</ul>
			</body>
		`, 'text/html');

		const output = postprocessEditorOutput(doc.body);

		expect(
			normalizeHtmlString(output.querySelector('ul').outerHTML),
		).toBe(
			normalizeHtmlString(`
				<ul>
					<li><input><span>Parent</span><ul><li><input><span>Nested</span></li></ul></li>
					<li><input><span>After nested</span></li>
				</ul>
			`),
		);
	});

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
