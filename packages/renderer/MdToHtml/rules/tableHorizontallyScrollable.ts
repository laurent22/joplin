import type * as MarkdownIt from 'markdown-it';
import type * as Renderer from 'markdown-it/lib/renderer';
import defaultRule from './utils/defaultRule';

export default {
	// Make table horizontally scrollable by give table a div parent, so the width of the table is limited to the screen width.
	// see https://github.com/laurent22/joplin/pull/10161
	plugin: (markdownIt: MarkdownIt) => {
		const defaultTableOpen = defaultRule(markdownIt, 'table_open');
		markdownIt.renderer.rules.table_open = function(tokens: MarkdownIt.Token[], idx: number, options: MarkdownIt.Options, env: unknown, renderer: Renderer) {
			const current = defaultTableOpen(tokens, idx, options, env, renderer);
			// joplin-table-wrapper css is set in packages/renderer/noteStyle.ts
			return `<div class="joplin-table-wrapper">\n${current}`;
		};

		const defaultTableClose = defaultRule(markdownIt, 'table_close');
		markdownIt.renderer.rules.table_close = function(tokens: MarkdownIt.Token[], idx: number, options: MarkdownIt.Options, env: unknown, renderer: Renderer) {
			const current = defaultTableClose(tokens, idx, options, env, renderer);
			return `${current}</div>\n`;
		};
	},
};
