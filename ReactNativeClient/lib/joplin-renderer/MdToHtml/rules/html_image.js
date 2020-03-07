// const Resource = require('lib/models/Resource.js');
const htmlUtils = require('../../htmlUtils.js');
const utils = require('../../utils');

function renderImageHtml(before, src, after, ruleOptions) {
	const r = utils.imageReplacement(ruleOptions.ResourceModel, src, ruleOptions.resources, ruleOptions.resourceBaseUrl);
	if (typeof r === 'string') return r;
	if (r) return `<img ${before} ${htmlUtils.attributesHtml(r)} ${after}/>`;
	return `[Image: ${src}]`;
}

function installRule(markdownIt, mdOptions, ruleOptions) {
	const Resource = ruleOptions.ResourceModel;

	const htmlBlockDefaultRender =
		markdownIt.renderer.rules.html_block ||
		function(tokens, idx, options, env, self) {
			return self.renderToken(tokens, idx, options);
		};

	const htmlInlineDefaultRender =
		markdownIt.renderer.rules.html_inline ||
		function(tokens, idx, options, env, self) {
			return self.renderToken(tokens, idx, options);
		};

	const imageRegex = /<img(.*?)src=["'](.*?)["'](.*?)>/gi;

	const handleImageTags = function(defaultRender) {
		return function(tokens, idx, options, env, self) {
			const token = tokens[idx];
			const content = token.content;

			if (!content.match(imageRegex)) return defaultRender(tokens, idx, options, env, self);

			return content.replace(imageRegex, (v, before, src, after) => {
				if (!Resource.isResourceUrl(src)) return `<img${before}src="${src}"${after}>`;
				return renderImageHtml(before, src, after, ruleOptions);
			});
		};
	};

	// It seems images sometimes are inline, sometimes a block
	// to make sure they both render correctly.
	markdownIt.renderer.rules.html_block = handleImageTags(htmlBlockDefaultRender);
	markdownIt.renderer.rules.html_inline = handleImageTags(htmlInlineDefaultRender);
}

module.exports = function(context, ruleOptions) {
	return function(md, mdOptions) {
		installRule(md, mdOptions, ruleOptions);
	};
};
