// const Resource = require('lib/models/Resource.js');
const utils = require('../../utils');

function installRule(markdownIt, mdOptions, ruleOptions) {
	const defaultRender = markdownIt.renderer.rules.link_open;

	markdownIt.renderer.rules.link_open = (tokens, idx, options, env, self) => {
		const Resource = ruleOptions.ResourceModel;

		const token = tokens[idx];
		const src = utils.getAttr(token.attrs, 'href');

		if (!Resource.isResourceUrl(src) || ruleOptions.plainResourceRendering) return defaultRender(tokens, idx, options, env, self);

		const r = utils.resourceReplacement(ruleOptions.ResourceModel, src, ruleOptions.resources, ruleOptions.resourceBaseUrl);
		if (typeof r === 'string') return r;
		if (r) return `<audio controls><source src='${r.src}'></audio><a href=# onclick=ipcProxySendToHost('joplin://${src.substring(2)}')>`;

		return defaultRender(tokens, idx, options, env, self);
	};
}

module.exports = function(context, ruleOptions) {
	return function(md, mdOptions) {
		installRule(md, mdOptions, ruleOptions);
	};
};
