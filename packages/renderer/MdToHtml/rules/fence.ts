/* eslint prefer-const: 0*/

// Note: this is copied from https://github.com/markdown-it/markdown-it/blob/master/lib/renderer.js
// Markdown-it assigns a special meaning to code returned from highlight() when it starts with PRE or not.
// If it starts with PRE, the highlited code is returned as-is. If it does not, it is wrapped in <PRE><CODE>
// This is a bit of a hack and magic behaviour, and it prevents us from returning a DIV from the highlight
// function.
// So we modify the code below to allow highlight() to return an object that tells how to render
// the code.

import type * as MarkdownIt from 'markdown-it';
import type Token = require('markdown-it/lib/token');
import type Renderer = require('markdown-it/lib/renderer');

function plugin(markdownIt: MarkdownIt) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- options.highlight may return either a string or `{ wrapCode, html }` (non-standard return contract for fence rendering); see MdToHtml.render where highlight is defined
	markdownIt.renderer.rules.fence = function(tokens: Token[], idx: number, options: any, _env: unknown, slf: Renderer) {
		let token = tokens[idx],
			info = token.info ? markdownIt.utils.unescapeAll(token.info).trim() : '',
			langName = '',
			highlighted, i, tmpAttrs, tmpToken;

		if (info) {
			langName = info.split(/\s+/g)[0];
		}

		if (options.highlight) {
			highlighted = options.highlight(token.content, langName) || markdownIt.utils.escapeHtml(token.content);
		} else {
			highlighted = markdownIt.utils.escapeHtml(token.content);
		}

		const wrapCode = highlighted && highlighted.wrapCode !== false;
		highlighted = typeof highlighted !== 'string' ? highlighted.html : highlighted;

		if (highlighted.indexOf('<pre') === 0 || !wrapCode) {
			return `${highlighted}\n`;
		}

		// If language exists, inject class gently, without modifying original token.
		// May be, one day we will add .clone() for token and simplify this part, but
		// now we prefer to keep things local.
		if (info) {
			i = token.attrIndex('class');
			tmpAttrs = token.attrs ? token.attrs.slice() : [];

			if (i < 0) {
				tmpAttrs.push(['class', options.langPrefix + langName]);
			} else {
				tmpAttrs[i][1] += ` ${options.langPrefix}${langName}`;
			}

			// Fake token just to render attributes
			tmpToken = {
				attrs: tmpAttrs,
			};

			return `<pre><code${slf.renderAttrs(tmpToken as Token)}>${
				highlighted
			}</code></pre>\n`;
		}


		return `<pre><code${slf.renderAttrs(token)}>${
			highlighted
		}</code></pre>\n`;
	};
}

export default {
	plugin,
};

