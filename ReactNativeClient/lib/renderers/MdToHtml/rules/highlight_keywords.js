const StringUtils = require('lib/string-utils.js');
const md5 = require('md5');

function createHighlightedTokens(Token, splitted) {
	let token;
	const output = [];

	for (let i = 0; i < splitted.length; i++) {
		const text = splitted[i];
		if (!text) continue;

		if (i % 2 === 0) {
			token = new Token('text', '', 0);
			token.content = text;
			output.push(token);
		} else {
			token = new Token('highlighted_keyword_open', 'span', 1);
			token.attrs = [['class', 'highlighted-keyword']];
			output.push(token);

			token = new Token('text', '', 0);
			token.content = text;
			output.push(token);

			token = new Token('highlighted_keyword_close', 'span', -1);
			output.push(token);
		}
	}

	return output;
}

function installRule(markdownIt, mdOptions, ruleOptions) {
	const divider = md5(Date.now().toString() + Math.random().toString());

	markdownIt.core.ruler.push('highlight_keywords', state => {
		const keywords = ruleOptions.highlightedKeywords;
		if (!keywords || !keywords.length) return;

		const tokens = state.tokens;
		const Token = state.Token;

		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];

			if (token.type !== 'inline') continue;

			for (let j = 0; j < token.children.length; j++) {
				const child = token.children[j];
				if (child.type !== 'text') continue;

				const splitted = StringUtils.surroundKeywords(keywords, child.content, divider, divider).split(divider);
				const splittedTokens = createHighlightedTokens(Token, splitted);
				if (splittedTokens.length <= 1) continue;

				token.children = markdownIt.utils.arrayReplaceAt(token.children, j, splittedTokens);
				j += splittedTokens.length - 1;
			}
		}
	});
}

module.exports = function(context, ruleOptions) {
	return function(md, mdOptions) {
		installRule(md, mdOptions, ruleOptions);
	};
};
