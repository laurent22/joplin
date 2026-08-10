import postprocessEditorOutput from './postprocessEditorOutput';

const normalizeHtmlString = (html: string) => {
	return html.replace(/\s+/g, ' ').trim();
};

const processListHtml = (inputHtml: string) => {
	const doc = new DOMParser().parseFromString(`<body>${inputHtml}</body>`, 'text/html');
	const output = postprocessEditorOutput(doc.body);
	return normalizeHtmlString(output.querySelector('ul').outerHTML);
};

describe('postprocessEditorOutput', () => {
	test.each([
		[
			'should remove extra paragraphs from around list items',
			`<ul>
				<li><p>Test</p></li>
				<li>Test 2</li>
				<li><p></p><p>Test 3</p><p></p></li>
			</ul>`,
			`<ul>
				<li>Test</li>
				<li>Test 2</li>
				<li>Test 3</li>
			</ul>`,
		],
		[
			'should remove wrapper paragraph from list items with nested lists',
			`<ul>
				<li><p>Parent item</p><ul><li><p>Nested item</p></li></ul></li>
				<li><p>After nested</p></li>
			</ul>`,
			`<ul>
				<li>Parent item<ul><li>Nested item</li></ul></li>
				<li>After nested</li>
			</ul>`,
		],
		[
			'should preserve multiple paragraphs in list items with nested lists',
			`<ul>
				<li><p>First paragraph</p><p>Second paragraph</p><ul><li><p>Nested</p></li></ul></li>
			</ul>`,
			`<ul>
				<li><p>First paragraph</p><p>Second paragraph</p><ul><li>Nested</li></ul></li>
			</ul>`,
		],
		[
			'should preserve non-consecutive paragraphs separated by nested lists',
			`<ul>
				<li><p>Before</p><ul><li><p>Nested</p></li></ul><p>After</p></li>
			</ul>`,
			`<ul>
				<li><p>Before</p><ul><li>Nested</li></ul><p>After</p></li>
			</ul>`,
		],
		[
			'should preserve text nodes before paragraphs in list items',
			`<ul>
				<li>Text before<p>Paragraph</p></li>
			</ul>`,
			`<ul>
				<li>Text before<p>Paragraph</p></li>
			</ul>`,
		],
		[
			'should remove wrapper paragraph from checklist items with nested lists',
			`<ul>
				<li><input><div><p>Parent</p><ul><li><input><div><p>Nested</p></div></li></ul></div></li>
				<li><input><div><p>After nested</p></div></li>
			</ul>`,
			`<ul>
				<li><input><span>Parent</span><ul><li><input><span>Nested</span></li></ul></li>
				<li><input><span>After nested</span></li>
			</ul>`,
		],
		[
			'should remove wrapper paragraphs from around checklist items',
			`<ul>
				<li><input><div><p>Should remove single wrapper paragraphs.</p></div></li>
				<li><input><div><p>Should not remove paragraphs...</p><p>...when there are multiple.</p></div></li>
			</ul>`,
			`<ul>
				<li><input><span>Should remove single wrapper paragraphs.</span></li>
				<li><input><div><p>Should not remove paragraphs...</p><p>...when there are multiple.</p></div></li>
			</ul>`,
		],
	])('%s', (_name, input, expected) => {
		expect(processListHtml(input)).toBe(normalizeHtmlString(expected));
	});
});
