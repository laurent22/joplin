// const Resource = require('lib/models/Resource.js');
const utils = require('../../utils');
const htmlUtils = require('../../htmlUtils.js');

function installRule(markdownIt, mdOptions, ruleOptions) {
	const defaultRender = markdownIt.renderer.rules.image;

	markdownIt.renderer.rules.image = (tokens, idx, options, env, self) => {
		const Resource = ruleOptions.ResourceModel;

		const token = tokens[idx];
		const src = utils.getAttr(token.attrs, 'src');
		const title = utils.getAttr(token.attrs, 'title');

		if (!Resource.isResourceUrl(src) || ruleOptions.plainResourceRendering) return defaultRender(tokens, idx, options, env, self);

		const r = utils.imageReplacement(ruleOptions.ResourceModel, src, ruleOptions.resources, ruleOptions.resourceBaseUrl);
		if (typeof r === 'string') return r;
		if (r) {
			let js = '';
			if (ruleOptions.enableLongPress) {
				const longPressDelay = ruleOptions.longPressDelay ? ruleOptions.longPressDelay : 500;
				const id = r['data-resource-id'];

				const longPressHandler = `${ruleOptions.postMessageSyntax}('longclick:${id}')`;

				const touchStart = `t=setTimeout(()=>{t=null; ${longPressHandler};}, ${longPressDelay});`;
				const touchEnd = 'if (!!t) clearTimeout(t); t=null';

				js = ` ontouchstart="${touchStart}" ontouchend="${touchEnd}"`;
			}

			return `<img data-from-md ${htmlUtils.attributesHtml(Object.assign({}, r, { title: title }))}${js}/>`;
		}
		return defaultRender(tokens, idx, options, env, self);
	};
}

module.exports = function(context, ruleOptions) {
	return function(md, mdOptions) {
		installRule(md, mdOptions, ruleOptions);
	};
};
