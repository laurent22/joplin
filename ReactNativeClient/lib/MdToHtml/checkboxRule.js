const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = (new Entities()).encode;
const Resource = require('lib/models/Resource.js');
const utils = require('./utils');

let checkboxNum_ = 0;

function createPrefixTokens(Token, id, checked, label) {
	let token = null;
	const tokens = [];

	token = new Token('checkbox_input', 'input', 0);
	token.attrs = [['type', 'checkbox'], ['id', id]];
	if (checked) token.attrs.push(['checked', 'true']);
	tokens.push(token);

	token = new Token('label_open', 'label', 1);
	token.attrs = [['for', id]];
	tokens.push(token);

	if (label) {
		token = new Token('text', '', 0);
		token.content = label;
		tokens.push(token);
	}

	return tokens;
}

function createSuffixTokens(Token) {
	return [new Token('label_close', 'label', -1)];
}

function installRule(markdownIt, style, mdOptions, ruleOptions) {
	markdownIt.core.ruler.push('checkbox', state => {
		const tokens = state.tokens;
		const Token = state.Token;

		const checkboxPattern = /^\[([x|X| ])\] (.*)$/
		let currentListItem = null;
		let processedFirstInline = false;
		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];

			if (token.type === 'list_item_open') {
				currentListItem = token;
				processedFirstInline = false;
				continue;
			}

			if (token.type === 'list_item_close') {
				currentListItem = null;
				processedFirstInline = false;
				continue;
			}

			if (currentListItem && !processedFirstInline && token.type === 'inline') {
				processedFirstInline = true;
				const firstChild = token.children && token.children.length ? token.children[0] : null;
				if (!firstChild) continue;

				const matches = checkboxPattern.exec(firstChild.content);
				if (!matches || matches.length < 2) continue;

				checkboxNum_++;
				const checked = matches[1] !== ' ';
				const id = 'md-checkbox-' + checkboxNum_;
				const label = matches.length >= 3 ? matches[2] : '';

				// Prepend the text content with the checkbox markup and the opening <label> tag
				// then append the </label> tag at the end of the text content.

				const prefix = createPrefixTokens(Token, id, checked, label);
				const suffix = createSuffixTokens(Token);

				token.children = markdownIt.utils.arrayReplaceAt(token.children, 0, prefix);
				token.children = token.children.concat(suffix);

				// Add a class to the <li> container so that it can be targetted with CSS.

				let itemClass = currentListItem.attrGet('class');
				if (!itemClass) itemClass = '';
				itemClass += ' md-checkbox';
				currentListItem.attrSet('class', itemClass.trim());
			}
		}
	});
}

module.exports = function(style, ruleOptions) {
	return function(md, mdOptions) {
		installRule(md, style, mdOptions, ruleOptions);
	};
};