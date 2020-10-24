const md5 = require('md5');
const htmlUtils = require('../../htmlUtils');

// @ts-ignore: Keep the function signature as-is despite unusued arguments
function installRule(markdownIt:any, mdOptions:any, ruleOptions:any, context:any) {
	markdownIt.core.ruler.push('sanitize_html', (state:any) => {
		const tokens = state.tokens;

		const walkHtmlTokens = (tokens:any[]) => {
			if (!tokens || !tokens.length) return;

			for (const token of tokens) {
				if (!['html_block', 'html_inline'].includes(token.type)) {
					walkHtmlTokens(token.children);
					continue;
				}

				const cacheKey = md5(escape(token.content));
				let sanitizedContent = context.cache.get(cacheKey);

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
					sanitizedContent = htmlUtils.sanitizeHtml(token.content, { addNoMdConvClass: true });
				}

				token.content = sanitizedContent;

				context.cache.put(cacheKey, sanitizedContent, 1000 * 60 * 60);
				walkHtmlTokens(token.children);
			}
		};

		walkHtmlTokens(tokens);
	});
}

export default function(context:any, ruleOptions:any) {
	return function(md:any, mdOptions:any) {
		installRule(md, mdOptions, ruleOptions, context);
	};
}
