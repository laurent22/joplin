import { escapeHtml, formatInlineMarkdown, releaseNotesToHtml } from './releaseNotesUtils';

describe('releaseNotesUtils', () => {

	describe('escapeHtml', () => {
		it('should escape ampersands', () => {
			expect(escapeHtml('a & b')).toBe('a &amp; b');
		});

		it('should escape angle brackets', () => {
			expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
		});

		it('should escape quotes', () => {
			expect(escapeHtml('"hello" & \'world\'')).toBe('&quot;hello&quot; &amp; &#039;world&#039;');
		});

		it('should return empty string for empty input', () => {
			expect(escapeHtml('')).toBe('');
		});

		it('should not modify plain text', () => {
			expect(escapeHtml('hello world')).toBe('hello world');
		});
	});

	describe('formatInlineMarkdown', () => {
		it('should convert bold text', () => {
			expect(formatInlineMarkdown('this is **bold** text')).toBe('this is <strong>bold</strong> text');
		});

		it('should convert inline code', () => {
			expect(formatInlineMarkdown('use `console.log`')).toBe('use <code>console.log</code>');
		});

		it('should convert markdown links', () => {
			expect(formatInlineMarkdown('[Joplin](https://joplinapp.org)')).toBe(
				'<a href="https://joplinapp.org" target="_blank">Joplin</a>',
			);
		});

		it('should handle multiple inline formats together', () => {
			const input = '**bold** and `code` and [link](http://example.com)';
			const result = formatInlineMarkdown(input);
			expect(result).toContain('<strong>bold</strong>');
			expect(result).toContain('<code>code</code>');
			expect(result).toContain('<a href="http://example.com" target="_blank">link</a>');
		});

		it('should escape HTML before formatting', () => {
			expect(formatInlineMarkdown('**<script>**')).toBe('<strong>&lt;script&gt;</strong>');
		});

		it('should return plain escaped text when no markdown is present', () => {
			expect(formatInlineMarkdown('plain text')).toBe('plain text');
		});
	});

	describe('releaseNotesToHtml', () => {
		it('should return empty string for empty input', () => {
			expect(releaseNotesToHtml('')).toBe('');
		});

		it('should return empty string for null input', () => {
			expect(releaseNotesToHtml(null)).toBe('');
		});

		it('should return empty string for undefined input', () => {
			expect(releaseNotesToHtml(undefined)).toBe('');
		});

		it('should convert headers', () => {
			const result = releaseNotesToHtml('## What is new');
			expect(result).toBe('<h2>What is new</h2>');
		});

		it('should convert different header levels', () => {
			const input = '# H1\n## H2\n### H3';
			const result = releaseNotesToHtml(input);
			expect(result).toContain('<h1>H1</h1>');
			expect(result).toContain('<h2>H2</h2>');
			expect(result).toContain('<h3>H3</h3>');
		});

		it('should convert dash list items', () => {
			const result = releaseNotesToHtml('- First item\n- Second item');
			expect(result).toContain('<li>First item</li>');
			expect(result).toContain('<li>Second item</li>');
		});

		it('should convert asterisk list items', () => {
			const result = releaseNotesToHtml('* First item\n* Second item');
			expect(result).toContain('<li>First item</li>');
			expect(result).toContain('<li>Second item</li>');
		});

		it('should convert horizontal rules', () => {
			expect(releaseNotesToHtml('---')).toBe('<hr/>');
			expect(releaseNotesToHtml('___')).toBe('<hr/>');
			expect(releaseNotesToHtml('* * *')).toBe('<hr/>');
		});

		it('should wrap plain text in paragraphs', () => {
			const result = releaseNotesToHtml('Some plain text');
			expect(result).toBe('<p>Some plain text</p>');
		});

		it('should skip blank lines', () => {
			const result = releaseNotesToHtml('Line 1\n\n\nLine 2');
			expect(result).toBe('<p>Line 1</p>\n<p>Line 2</p>');
		});

		it('should handle a realistic release note', () => {
			const input = [
				'## New features',
				'',
				'- Added **dark mode** support',
				'- New `search` command',
				'',
				'## Bug fixes',
				'',
				'- Fixed crash on startup',
				'- Fixed [issue #123](https://github.com/example/issues/123)',
			].join('\n');

			const result = releaseNotesToHtml(input);
			expect(result).toContain('<h2>New features</h2>');
			expect(result).toContain('<li>Added <strong>dark mode</strong> support</li>');
			expect(result).toContain('<li>New <code>search</code> command</li>');
			expect(result).toContain('<h2>Bug fixes</h2>');
			expect(result).toContain('<li>Fixed crash on startup</li>');
			expect(result).toContain('<a href="https://github.com/example/issues/123" target="_blank">issue #123</a>');
		});

		it('should escape HTML in release notes to prevent XSS', () => {
			const input = '- <script>alert("xss")</script>';
			const result = releaseNotesToHtml(input);
			expect(result).not.toContain('<script>');
			expect(result).toContain('&lt;script&gt;');
		});

		it('should handle headers with special characters', () => {
			const result = releaseNotesToHtml('## Version 3.2.1 & "Improvements"');
			expect(result).toBe('<h2>Version 3.2.1 &amp; &quot;Improvements&quot;</h2>');
		});
	});
});
