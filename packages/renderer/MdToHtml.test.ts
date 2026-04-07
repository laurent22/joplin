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
});
