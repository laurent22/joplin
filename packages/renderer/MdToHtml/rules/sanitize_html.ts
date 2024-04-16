import { RuleOptions } from '../../MdToHtml';
import htmlUtils from '../../htmlUtils';

const md5 = require('md5');

export default {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	plugin: function(markdownIt: any, ruleOptions: RuleOptions) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		markdownIt.core.ruler.push('sanitize_html', (state: any) => {
			const tokens = state.tokens;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const walkHtmlTokens = (tokens: any[]) => {
				if (!tokens || !tokens.length) return;

				for (const token of tokens) {
					if (!['html_block', 'html_inline'].includes(token.type)) {
						walkHtmlTokens(token.children);
						continue;
					}

					const cacheKey = md5(escape(token.content));
					let sanitizedContent = ruleOptions.context.cache.value(cacheKey);

					// For html_inline, the content is only a fragment of HTML, as it will be rendered, but
					// it's not necessarily valid HTML. For example this HTML:
					//
					// <a href="#">Testing</a>
					//
					// will be rendered as three tokens:
					//
					// html_inline: <a href="#">
					// text: Testing
					// html_inline: </a>
					//
					// So the sanitizeHtml function must handle this kind of non-valid HTML.

					if (!sanitizedContent) {
						sanitizedContent = htmlUtils.sanitizeHtml(
							token.content,
							{
								addNoMdConvClass: true,
								allowedFilePrefixes: ruleOptions.allowedFilePrefixes,
							},
						);
					}

					token.content = sanitizedContent;

					ruleOptions.context.cache.setValue(cacheKey, sanitizedContent, 1000 * 60 * 60);
					walkHtmlTokens(token.children);
				}
			};

			walkHtmlTokens(tokens);
		});
	},
};
