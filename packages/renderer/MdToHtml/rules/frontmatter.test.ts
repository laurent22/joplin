import { describe, test, expect } from '@jest/globals';
import MarkdownIt = require('markdown-it');
import frontmatter from './frontmatter';

const createMarkdownIt = () => {
	const markdownIt = new MarkdownIt();
	markdownIt.use(frontmatter.plugin, {});
	return markdownIt;
};

describe('frontmatter', () => {

	test('should render a basic frontmatter block', () => {
		const md = createMarkdownIt();
		const input = '---\ntitle: Test\n---\n\n# Heading';
		const output = md.render(input);

		expect(output).toContain('joplin-editable');
		expect(output).toContain('joplin-frontmatter');
		expect(output).toContain('joplin-source');
		expect(output).toContain('data-joplin-language="frontmatter"');
		expect(output).toContain('title: Test');
		expect(output).toContain('<h1>Heading</h1>');
	});

	test('should render frontmatter with multiple properties', () => {
		const md = createMarkdownIt();
		const input = '---\ntitle: My Document\ndate: 2024-01-01\ntags: [one, two]\n---\n\nContent here.';
		const output = md.render(input);

		expect(output).toContain('joplin-frontmatter');
		expect(output).toContain('title: My Document');
		expect(output).toContain('date: 2024-01-01');
		expect(output).toContain('tags: [one, two]');
		expect(output).toContain('<p>Content here.</p>');
	});

	test('should not parse frontmatter if not at document start', () => {
		const md = createMarkdownIt();
		const input = 'Some text\n\n---\ntitle: Test\n---';
		const output = md.render(input);

		// Should not contain frontmatter class
		expect(output).not.toContain('joplin-frontmatter');
		// The --- should be treated as a horizontal rule
		expect(output).toContain('<hr');
	});

	test('should not parse frontmatter without closing delimiter', () => {
		const md = createMarkdownIt();
		const input = '---\ntitle: Test\n\n# Heading';
		const output = md.render(input);

		// Should not contain frontmatter class since there's no closing ---
		expect(output).not.toContain('joplin-frontmatter');
		// The --- at the start becomes a horizontal rule
		expect(output).toContain('<hr');
	});

	test('should handle empty frontmatter block', () => {
		const md = createMarkdownIt();
		const input = '---\n---\n\n# Heading';
		const output = md.render(input);

		expect(output).toContain('joplin-frontmatter');
		expect(output).toContain('<h1>Heading</h1>');
	});

	test('should include horizontal rule markers in rendered output', () => {
		const md = createMarkdownIt();
		const input = '---\ntitle: Test\n---\n\nContent';
		const output = md.render(input);

		// Should have the frontmatter markers (rendered as <hr>)
		expect(output).toContain('joplin-frontmatter-marker');
	});

	test('should have correct source-open and source-close attributes for round-trip editing', () => {
		const md = createMarkdownIt();
		const input = '---\nkey: value\n---\n\nText';
		const output = md.render(input);

		// The joplin-source should contain just the YAML content
		expect(output).toContain('key: value');
		// The data-joplin-source-open should have the opening delimiter with newline
		expect(output).toContain('data-joplin-source-open="---&#10;"');
		// The data-joplin-source-close should have newline + closing delimiter + newline
		expect(output).toContain('data-joplin-source-close="&#10;---&#10;"');
	});
});
