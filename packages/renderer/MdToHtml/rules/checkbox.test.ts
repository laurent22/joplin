import { describe, test, expect } from '@jest/globals';
import MarkdownIt = require('markdown-it');
import checkbox from './checkbox';

const createMarkdownIt = (options: any = {}) => {
	const markdownIt = new MarkdownIt();
	markdownIt.use(checkbox.plugin as any, {
		postMessageSyntax: 'ipcRenderer.sendToHost',
		...options,
	});
	return markdownIt;
};

describe('checkbox rule', () => {

	test('should render standard unchecked and checked checkboxes', () => {
		const md = createMarkdownIt();
		const input = '- [ ] todo item\n- [x] done item\n- [X] done capitalized item';
		const output = md.render(input);

		expect(output).toContain('type="checkbox"');
		expect(output).toContain('class="checkbox-label-unchecked">todo item</label>');
		expect(output).toContain('class="checkbox-label-checked">done item</label>');
		expect(output).toContain('class="checkbox-label-checked">done capitalized item</label>');
	});

	test('should NOT treat - [|] as a checkbox', () => {
		const md = createMarkdownIt();
		const input = '- [|] not a checkbox';
		const output = md.render(input);

		// [|] should NOT be parsed as a checkbox input
		expect(output).not.toContain('type="checkbox"');
		expect(output).not.toContain('md-checkbox');
		expect(output).toContain('[|] not a checkbox');
	});

	test('should support empty checkboxes without trailing space', () => {
		const md = createMarkdownIt();
		const input = '- [ ]\n- [x]';
		const output = md.render(input);

		expect(output).toContain('class="checkbox-label-unchecked"');
		expect(output).toContain('class="checkbox-label-checked"');
		expect(output).not.toContain('<li>[ ]</li>');
		expect(output).not.toContain('<li>[x]</li>');
	});

	test('should correctly render checkboxes in RTE / checklist mode (renderingType = 2)', () => {
		const md = createMarkdownIt({ checkboxRenderingType: 2 });
		const input = '- [ ] todo\n- [x] done\n- [ ]';
		const output = md.render(input);

		expect(output).toContain('<ul class="joplin-checklist" data-is-checklist="1">');
		expect(output).toContain('<li class="checked">done</li>');
		expect(output).toContain('<li>todo</li>');
		expect(output).toContain('<li></li>');
	});

});
