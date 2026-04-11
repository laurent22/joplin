import MdToHtml from './MdToHtml';

describe('MdToHtml heading hashes', () => {
	test.each([
		['## [ ] title', 'title'],
		['## [x] title', 'title'],
		['## [X] title', 'title'],
	])('should generate canonical heading ids for task-marker headings (input: %j)', async (input: string, expectedHash: string) => {
		const renderer = new MdToHtml();
		const result = await renderer.render(input, null, { bodyOnly: true });

		expect(result.html).toContain(`id="${expectedHash}"`);
	});

	test('should include a legacy alias anchor when canonical and legacy hashes differ', async () => {
		const renderer = new MdToHtml();
		const result = await renderer.render('## [x] title', null, { bodyOnly: true });

		expect(result.html).toContain('id="title"');
		expect(result.html).toContain('id="x-title"');
		expect(result.html).toContain('joplin-heading-legacy-anchor');
	});

	test.each([
		'## title',
		'## [ ] title',
	])('should not include a legacy alias anchor when canonical and legacy hashes are identical (input: %j)', async (input: string) => {
		const renderer = new MdToHtml();
		const result = await renderer.render(input, null, { bodyOnly: true });

		expect(result.html).not.toContain('joplin-heading-legacy-anchor');
	});

	test('should de-duplicate legacy alias anchors against canonical heading ids', async () => {
		const renderer = new MdToHtml();
		const result = await renderer.render('## [x] title\n## x title', null, { bodyOnly: true });

		expect(result.html).toContain('id="title"');
		expect(result.html).toContain('id="x-title"');
		expect(result.html).toContain('id="x-title-2" class="joplin-heading-legacy-anchor"');
		expect((result.html.match(/id="x-title"/g) ?? []).length).toBe(1);
	});
});
