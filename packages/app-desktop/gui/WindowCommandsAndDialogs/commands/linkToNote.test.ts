import { MarkupLanguage } from '@joplin/renderer';
import { noteLinkMarkup } from './linkToNote';

describe('linkToNote', () => {
	test('should create a Markdown link for Markdown notes', () => {
		expect(noteLinkMarkup('Target [note]', 'abc123', MarkupLanguage.Markdown)).toBe('[Target \\[note\\]](:/abc123)');
	});

	test('should create an HTML link for HTML notes', () => {
		expect(noteLinkMarkup('Target note', 'abc123', MarkupLanguage.Html)).toBe('<a href=":/abc123">Target note</a>');
	});

	test('should escape HTML in note titles', () => {
		expect(noteLinkMarkup('A <note> & "quote"', 'abc123', MarkupLanguage.Html)).toBe('<a href=":/abc123">A &lt;note&gt; &amp; &quot;quote&quot;</a>');
	});
});
