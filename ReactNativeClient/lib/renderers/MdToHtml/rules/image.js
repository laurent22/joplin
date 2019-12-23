const Resource = require('lib/models/Resource.js');
const utils = require('../../utils');
const htmlUtils = require('lib/htmlUtils.js');

function installRule(markdownIt, mdOptions, ruleOptions) {
	const defaultRender = markdownIt.renderer.rules.image;

	console.log('hello!');

	markdownIt.renderer.rules.image = (tokens, idx, options, env, self) => {
		const token = tokens[idx];
		const src = utils.getAttr(token.attrs, 'src');
		const title = utils.getAttr(token.attrs, 'title');

		// const imageRegex = /<img(.*?)src=["'](.*?)["'](.*?)>/gi;

		console.log({src, split: src.split('%7C')});
		// if (src.match(imageRegex)) {
		// 	console.log('match!')
		// }

		if (!Resource.isResourceUrl(src) || ruleOptions.plainResourceRendering) {
			return defaultRender(tokens, idx, options, env, self);
		}

		const r = utils.imageReplacement(src, ruleOptions.resources, ruleOptions.resourceBaseUrl);
		if (typeof r === 'string') return r;
		if (r) return `<img data-from-md ${htmlUtils.attributesHtml(Object.assign({}, r, { title: title }))}/>`;

		return defaultRender(tokens, idx, options, env, self);
	};
	markdownIt.renderer.rules.foooooo = (tokens, idx, options, env, self) => {

		console.log('in fooooo');
		return defaultRender(tokens, idx, options, env, self);
	};
}

module.exports = function(context, ruleOptions) {
	return function(md, mdOptions) {
		installRule(md, mdOptions, ruleOptions);
	};
};
