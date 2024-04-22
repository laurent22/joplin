const TurndownService = require('@joplin/turndown');
const turndownPluginGfm = require('@joplin/turndown-plugin-gfm').gfm;
import markdownUtils from './markdownUtils';

const pdfUrlRegex = /[\s\S]*?\.pdf$/i;

export interface ParseOptions {
	anchorNames?: string[];
	preserveImageTagsWithSize?: boolean;
	preserveNestedTables?: boolean;
	preserveColorStyles?: boolean;
	baseUrl?: string;
	disableEscapeContent?: boolean;
	convertEmbeddedPdfsToLinks?: boolean;
}

export default class HtmlToMd {

	public parse(html: string, options: ParseOptions = {}) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const turndownOpts: any = {
			headingStyle: 'atx',
			anchorNames: options.anchorNames ? options.anchorNames.map(n => n.trim().toLowerCase()) : [],
			codeBlockStyle: 'fenced',
			preserveImageTagsWithSize: !!options.preserveImageTagsWithSize,
			preserveNestedTables: !!options.preserveNestedTables,
			preserveColorStyles: !!options.preserveColorStyles,
			bulletListMarker: '-',
			emDelimiter: '*',
			strongDelimiter: '**',

			// If soft-breaks are enabled, lines need to end with two or more spaces for
			// trailing <br/>s to render. See
			// https://github.com/laurent22/joplin/issues/8430
			br: '  ',

			disableEscapeContent: 'disableEscapeContent' in options ? options.disableEscapeContent : false,
		};
		if (options.convertEmbeddedPdfsToLinks) {
			// Turndown ignores empty <object> tags, so we need to handle this case separately
			// https://github.com/mixmark-io/turndown/issues/293#issuecomment-588984202
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			turndownOpts.blankReplacement = (content: string, node: any) => {
				if (node.matches('object')) {
					return pdfRule.replacement(content, node, {});
				}

				if (node.isCode) {
					// Fix: Web clipper has trouble with code blocks on Joplin's website.
					// See https://github.com/laurent22/joplin/pull/10126#issuecomment-2016523281 .
					// If isCode, blank keep empty
					// test case: packages/app-cli/tests/html_to_md/code_multiline_3.html
					return '';
				}

				return '\n\n';
			};
		}
		const turndown = new TurndownService(turndownOpts);
		turndown.use(turndownPluginGfm);
		turndown.remove('script');
		turndown.remove('style');
		const pdfRule = {
			filter: ['embed', 'object'],
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			replacement: function(_content: string, node: any, _options: any) {
				// We are setting embedded_pdf as name so that we can later distinguish them from normal links and create resources for them.
				if (node.matches('embed') && node.getAttribute('src') && pdfUrlRegex.test(node.getAttribute('src'))) {
					return `[embedded_pdf](${node.getAttribute('src')})`;
				} else if (node.matches('object') && node.getAttribute('data') && pdfUrlRegex.test(node.getAttribute('data'))) {
					return `[embedded_pdf](${node.getAttribute('data')})`;
				}
				return '';
			},
		};
		if (options.convertEmbeddedPdfsToLinks) {
			turndown.addRule('pdf', pdfRule);
		}
		let md = turndown.turndown(html);
		if (options.baseUrl) md = markdownUtils.prependBaseUrl(md, options.baseUrl);
		return md;
	}

}
