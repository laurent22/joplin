import Setting from '@joplin/lib/models/Setting';
import { themeStyle } from '@joplin/lib/theme';
import { MarkupLanguage } from '@joplin/renderer';
import markupRenderOptions from './markupRenderOptions';
import { htmlentities } from '@joplin/utils/html';
import { pregQuote } from '@joplin/lib/string-utils';
import markupLanguageUtils from '@joplin/lib/markupLanguageUtils';
import { htmlToMarkdown } from '../../../utils';

describe('markupRenderOptions', () => {
	test.each([
		['https://joplinapp.org/', 'Ctrl+click to open link: https://joplinapp.org/'],
		['Link: [Note link](:/176ea2c82fb744f8ae182b8a5e36d343)', 'Ctrl+click to open link'],
		['[test](https://joplinapp.org/ "Test")', 'Test'],
	])('should add ctrl+click open instructions to links and convert them back to the original markup (rendering %s should have title %s)',
		async (markup, expectedTitle) => {
			const renderer = markupLanguageUtils.newMarkupToHtml();
			const theme = themeStyle(Setting.THEME_LIGHT);
			const rendered = await renderer.render(
				MarkupLanguage.Markdown,
				markup,
				theme,
				markupRenderOptions({ bodyOnly: true, resources: {} }),
			);

			// Should set the title correctly
			expect(rendered.html).toMatch(new RegExp(`title=['"]${pregQuote(htmlentities(expectedTitle))}['"]`));

			// Should convert back to the original markdown
			expect(await htmlToMarkdown(MarkupLanguage.Markdown, rendered.html, '')).toBe(markup);
		},
	);
});
