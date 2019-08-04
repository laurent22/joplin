const Resource = require('lib/models/Resource.js');
const utils = require('../../utils');
const htmlUtils = require('lib/htmlUtils.js');

function installRule(markdownIt, mdOptions, ruleOptions) {
	const defaultRender = markdownIt.renderer.rules.image;

	markdownIt.renderer.rules.image = (tokens, idx, options, env, self) => {
		const token = tokens[idx];
		const src = utils.getAttr(token.attrs, 'src');
		const title = utils.getAttr(token.attrs, 'title');

		if (!Resource.isResourceUrl(src)) return defaultRender(tokens, idx, options, env, self);

		const r = utils.imageReplacement(src, ruleOptions.resources, ruleOptions.resourceBaseUrl);
		if (typeof r === 'string') return r;
		if (r) return '<img data-from-md ' + htmlUtils.attributesHtml(Object.assign({}, r, { title: title })) + '/>';

		return defaultRender(tokens, idx, options, env, self);
	};
}

module.exports = function(context, ruleOptions) {
	return function(md, mdOptions) {
		installRule(md, mdOptions, ruleOptions);
	};
};
