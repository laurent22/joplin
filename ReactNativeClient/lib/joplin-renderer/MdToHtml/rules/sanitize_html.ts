const md5 = require('md5');
const htmlUtils = require('../../htmlUtils');

function getOpenTagName(html:string):string {
	const m = html.toLowerCase().match(/<([a-z]+)(\s|>)/);
	if (!m || m.length < 2) return null;
	return m[1];
}

function isSelfClosedTag(html:string):boolean {
	return html.substr(-2) === '/>';
}

function stripOffClosingTag(html:string, tagName:string):string {
	return html.substr(0, html.length - tagName.length - 3);
}

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
				// The problem for us is that when we pass this HTML fragment to the sanitize function
				// it is going to turn it into valid HTML. Thus:
				//
				// "<a href="#">" becomes "<a href="#"></a>"
				// "</a>" becomes ""
				//
				// So the result would be "<a href="#"></a>Testing"
				//
				// Because of this, we need to be careful with html_inline:
				//
				// 0. Check if it's an opening or closing tag - only opening ones need to be processed
				// 1. Sanitize the fragment
				// 2. Strip off the closing tag that was added
				//
				// Also self-closing tags need to be handled.
				//
				// html_block is not a problem as the whole content is valid HTML.

				if (!sanitizedContent) {
					if (token.type === 'html_inline') {
						const openTagName = getOpenTagName(token.content);
						const isSelfClosed = isSelfClosedTag(token.content);

						if (!openTagName) {
							sanitizedContent = token.content;
						} else {
							sanitizedContent = htmlUtils.sanitizeHtml(token.content);
							if (!isSelfClosed) {
								sanitizedContent = stripOffClosingTag(sanitizedContent, openTagName);
							}
						}
					} else { // html_block
						sanitizedContent = htmlUtils.sanitizeHtml(token.content);
					}
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
