const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = (new Entities()).encode;
const Resource = require('lib/models/Resource.js');
const utils = require('../utils');

let checkboxIndex_ = -1;

function createPrefixTokens(Token, id, checked, label, postMessageSyntax, sourceToken) {
	let token = null;
	const tokens = [];

	// A bit hard to handle errors here and it's unlikely that the token won't have a valid
	// map parameter, but if it does set it to a very high value, which will be more easy to notice
	// in calling code.
	const lineIndex = sourceToken.map && sourceToken.map.length ? sourceToken.map[0] : 99999999;
	const checkedString = checked ? 'checked' : 'unchecked';
	const js = postMessageSyntax + "('checkboxclick:" + checkedString + ':' + lineIndex + "'); return true;";

	token = new Token('checkbox_input', 'input', 0);
	token.attrs = [
		['type', 'checkbox'],
		['id', id],
		['onclick', js],
	];
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

function installRule(markdownIt, mdOptions, ruleOptions) {
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

				checkboxIndex_++;
				const checked = matches[1] !== ' ';
				const id = 'md-checkbox-' + checkboxIndex_;
				const label = matches.length >= 3 ? matches[2] : '';

				// Prepend the text content with the checkbox markup and the opening <label> tag
				// then append the </label> tag at the end of the text content.

				const prefix = createPrefixTokens(Token, id, checked, label, ruleOptions.postMessageSyntax, token);
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

module.exports = function(context, ruleOptions) {
	return function(md, mdOptions) {
		installRule(md, mdOptions, ruleOptions);
	};
};