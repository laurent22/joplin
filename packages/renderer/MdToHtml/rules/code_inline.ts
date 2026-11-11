import type * as MarkdownIt from 'markdown-it';
import type Token = require('markdown-it/lib/token');
import type Renderer = require('markdown-it/lib/renderer');

function plugin(markdownIt: MarkdownIt) {
	const defaultRender: Renderer.RenderRule =
		markdownIt.renderer.rules.code_inline ||
		function(tokens, idx, options, _env, self) {
			return self.renderToken(tokens, idx, options);
		};

	markdownIt.renderer.rules.code_inline = (tokens: Token[], idx: number, options: MarkdownIt.Options, env: unknown, self: Renderer) => {
		const token = tokens[idx];
		let tokenClass = token.attrGet('class');
		if (!tokenClass) tokenClass = '';
		tokenClass += ' inline-code';
		token.attrSet('class', tokenClass.trim());
		return defaultRender(tokens, idx, options, env, self);
	};
}

export default {
	plugin,
};
