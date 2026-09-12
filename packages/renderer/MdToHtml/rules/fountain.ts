import { RendererTheme } from '../../types';
import type * as MarkdownIt from 'markdown-it';
import type Token = require('markdown-it/lib/token');
import type Renderer = require('markdown-it/lib/renderer');

const fountain = require('../../vendor/fountain.min.js');
import htmlUtils from '../../htmlUtils';

const pluginAssets = function(theme: RendererTheme) {
	return [
		{
			inline: true,
			mime: 'text/css',
			text: `
				.fountain {
					font-family: monospace;
					line-height: 107%;
					max-width: 1000px;
					margin-left: auto;
					margin-right: auto;
				}

				.fountain .title-page,
				.fountain .page {
					padding: 1em 2em;
					margin-bottom: 2em;
				}

				.fountain .title-page {
					border-bottom: 1px solid ${theme.dividerColor};
				}

				@media print {
					.fountain .title-page,
					.fountain .page {
						page-break-after: always;
					}

					.fountain .title-page {
						border-bottom: none;
					}
				}

				.fountain hr {
					border: none;
					border-top: 1px solid ${theme.dividerColor};
					margin: 2em 0;
				}

				.fountain h1,
				.fountain h2,
				.fountain h3,
				.fountain h4,
				.fountain p {
					font-weight: normal;
					line-height: 107%;
					margin: 1em 0;
					border: none;
					font-size: 1em;
				}

				.fountain .bold {
					font-weight: bold;
				}

				.fountain .italic {
					font-style: italic;
				}

				.fountain .underline {
					text-decoration: underline;
				}

				.fountain .centered {
					text-align: center;
				}

				.fountain h2 {
					text-align: right;
				}

				.fountain .dialogue p.parenthetical {
					margin-left: 11%;
				}

				.fountain .title-page .credit,
				.fountain .title-page .authors,
				.fountain .title-page .source {
					text-align: center;
				}

				.fountain .title-page h1 {
					margin-bottom: 1.5em;
					text-align: center;
				}

				.fountain .title-page .source {
					margin-top: 1.5em;
				}

				.fountain .title-page .notes {
					text-align: right;
					margin: 3em 0;
				}

				.fountain .title-page h1 {
					margin-bottom: 1.5em;
					text-align: center;
				}

				.fountain .dialogue {
					margin-left: 3em;
					margin-right: 3em;
					margin-bottom: 1em;
				}

				.fountain .dialogue p,
				.fountain .dialogue h1,
				.fountain .dialogue h2,
				.fountain .dialogue h3,
				.fountain .dialogue h4 {
					margin: 0;
				}

				.fountain .dialogue h1,
				.fountain .dialogue h2,
				.fountain .dialogue h3,
				.fountain .dialogue h4 {
					text-align: center;
				}`,
		},
	];
};

function renderFountainScript(markdownIt: MarkdownIt, content: string) {
	const result = fountain.parse(content);

	let titlePageHtml = '';
	if (result.html.title_page) {
		titlePageHtml = `
			<div class="title-page">
				${result.html.title_page}
			</div>
		`;
	}

	const contentHtml = result.html.script;
	return `
		<!-- joplin-metadata-print-title = false -->
		<div class="fountain joplin-editable">
			<pre class="joplin-source" hidden data-joplin-language="fountain" data-joplin-source-open="\`\`\`fountain&#10;" data-joplin-source-close="&#10;\`\`\`&#10;">${markdownIt.utils.escapeHtml(content)}</pre>
			${htmlUtils.sanitizeHtml(titlePageHtml)}
			<div class="page">
				${htmlUtils.sanitizeHtml(contentHtml)}
			</div>
		</div>
	`;
}

function plugin(markdownIt: MarkdownIt) {
	const defaultRender: Renderer.RenderRule = markdownIt.renderer.rules.fence || function(tokens, idx, options, _env, self) {
		return self.renderToken(tokens, idx, options);
	};

	markdownIt.renderer.rules.fence = function(tokens: Token[], idx: number, options: MarkdownIt.Options, env: unknown, self: Renderer) {
		const token = tokens[idx];
		if (token.info !== 'fountain') return defaultRender(tokens, idx, options, env, self);
		return renderFountainScript(markdownIt, token.content);
	};
}

export default {
	plugin,
	assets: pluginAssets,
};
