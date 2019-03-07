// This rule is no longer needed because HTML anchors (as opposed to those generated from Markdown)
// are handled in webviewLib. Keeping it here for reference.

const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = (new Entities()).encode;
const Resource = require('lib/models/Resource.js');
const utils = require('../utils');

function installRule(markdownIt, mdOptions, ruleOptions) {
	const defaultRender = markdownIt.renderer.rules.html_block || function(tokens, idx, options, env, self) {
		return self.renderToken(tokens, idx, options);
	};

	const anchorRegex = /<a (.*)>/

	markdownIt.renderer.rules.html_inline = function(tokens, idx, options, env, self) {
		const token = tokens[idx];
		const content = token.content;

		if (!content.match(anchorRegex)) return defaultRender(tokens, idx, options, env, self);

		return content.replace(anchorRegex, (v, content) => {
			let js = `
				var href = this.getAttribute('href');
				if (!href || href.indexOf('http') < 0) return true;
				` + ruleOptions.postMessageSyntax + `(href);
				return false;
			`;
			js = js.split('\n').join(' ').replace(/\t/g, '');
			return '<a onclick="' + js + '" ' + content + '>';
		});
	};
}

module.exports = function(context, ruleOptions) {
	return function(md, mdOptions) {
		installRule(md, mdOptions, ruleOptions);
	};
};