import { describe, test, expect } from '@jest/globals';
import MarkdownIt = require('markdown-it');
import rtlLists from './rtlLists';

const createMarkdownIt = () => {
	const markdownIt = new MarkdownIt();
	markdownIt.use(rtlLists.plugin, {});
	return markdownIt;
};

describe('rtlLists', () => {

	// cSpell:disable
	test('should add dir="auto" to bullet list items', () => {
		const md = createMarkdownIt();
		const input = '- مرحبا\n- عالم';
		const output = md.render(input);

		expect(output).toContain('<li dir="auto">مرحبا</li>');
		expect(output).toContain('<li dir="auto">عالم</li>');
		expect(output).not.toContain('<ul dir=');
	});

	test('should add dir="auto" to numbered list items', () => {
		const md = createMarkdownIt();
		const input = '1. العنصر الأول\n2. العنصر الثاني';
		const output = md.render(input);

		expect(output).toContain('<li dir="auto">العنصر الأول</li>');
		expect(output).toContain('<li dir="auto">العنصر الثاني</li>');
		expect(output).not.toContain('<ol dir=');
	});

	test('should add dir="auto" to nested list items', () => {
		const md = createMarkdownIt();
		const input = '- المستوى الأول\n  - المستوى الفرعي\n    1. مرقم فرعي';
		const output = md.render(input);

		expect(output).toContain('<li dir="auto">المستوى الأول');
		expect(output).toContain('<li dir="auto">المستوى الفرعي');
		expect(output).toContain('<li dir="auto">مرقم فرعي');
		expect(output).not.toContain('<ul dir=');
		expect(output).not.toContain('<ol dir=');
	});
	// cSpell:enable

	test('should preserve normal LTR list rendering with dir="auto"', () => {
		const md = createMarkdownIt();
		const input = '- Item 1\n- Item 2\n  1. Subitem 1\n  2. Subitem 2';
		const output = md.render(input);

		expect(output).toContain('<li dir="auto">Item 1</li>');
		expect(output).toContain('<li dir="auto">Item 2');
		expect(output).toContain('<li dir="auto">Subitem 1</li>');
		expect(output).toContain('<li dir="auto">Subitem 2</li>');
		expect(output).not.toContain('<ul dir=');
		expect(output).not.toContain('<ol dir=');
	});

	test('surrounding ul and ol containers do not receive dir="auto"', () => {
		const md = createMarkdownIt();
		const input = '- Bullet item\n\n1. Numbered item';
		const output = md.render(input);

		expect(output).toMatch(/<ul>\s*<li dir="auto">Bullet item<\/li>\s*<\/ul>/);
		expect(output).toMatch(/<ol>\s*<li dir="auto">Numbered item<\/li>\s*<\/ol>/);
	});

});
