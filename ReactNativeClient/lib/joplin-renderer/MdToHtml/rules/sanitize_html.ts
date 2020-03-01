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

				if (!sanitizedContent) {
					sanitizedContent = htmlUtils.sanitizeHtml(token.content);
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
