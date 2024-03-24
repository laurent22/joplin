import * as MarkdownIt from 'markdown-it';

export default {
	// Make table horizontally scrollable by give table a div parent, so the width of the table is limited to the screen width.
	// see https://github.com/laurent22/joplin/pull/10161
	plugin: (markdownIt: MarkdownIt) => {
		markdownIt.renderer.rules.table_open = function(tokens: MarkdownIt.Token[], idx: number, options: MarkdownIt.Options, _env: any, renderer: any) {
			const current = renderer.renderToken(tokens, idx, options);
			// joplin-table-wrapper css is set in packages/renderer/noteStyle.ts
			return `<div class="joplin-table-wrapper">\n${current}`;
		};
		markdownIt.renderer.rules.table_close = function(tokens: MarkdownIt.Token[], idx: number, options: MarkdownIt.Options, _env: any, renderer: any) {
			const current = renderer.renderToken(tokens, idx, options);
			return `${current}</div>\n`;
		};
	},
};
