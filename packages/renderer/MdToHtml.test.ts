import MdToHtml from './MdToHtml';

describe('MdToHtml', () => {
	test('should generate stable heading anchors for task-marker headings', async () => {
		const renderer = new MdToHtml();

		const unchecked = await renderer.render('## [ ] Title');
		const checked = await renderer.render('## [x] Title');
		const checkedUppercase = await renderer.render('## [X] Title');

		expect(unchecked.html).toContain('id="title"');
		expect(checked.html).toContain('id="title"');
		expect(checkedUppercase.html).toContain('id="title"');
	});

	test('should expose legacy alias anchors when canonical and legacy hashes differ', async () => {
		const renderer = new MdToHtml();
		const checked = await renderer.render('## [x] Title');

		expect(checked.html).toContain('id="title"');
		expect(checked.html).toContain('id="x-title"');
		expect(checked.html).toContain('class="joplin-legacy-header-anchor"');
	});

	test('should not emit legacy alias anchors when canonical and legacy hashes are identical', async () => {
		const renderer = new MdToHtml();
		const plainHeading = await renderer.render('## Title');

		expect(plainHeading.html).toContain('id="title"');
		expect(plainHeading.html).not.toContain('joplin-legacy-header-anchor');
	});
});
