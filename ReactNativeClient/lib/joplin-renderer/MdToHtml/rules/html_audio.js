// const Resource = require('lib/models/Resource.js');
const htmlUtils = require('../../htmlUtils.js');
const utils = require('../../utils');

function renderAudioHtml(before, src, after, ruleOptions) {
	const r = utils.audioReplacement(ruleOptions.ResourceModel, src, ruleOptions.resources, ruleOptions.resourceBaseUrl);
	if (typeof r === 'string') return r;
	if (r) return `<source ${before} ${htmlUtils.attributesHtml(r)} ${after}/>`;
	return `[Audio: ${src}]`;
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

	const audioRegex = /<source(.*?)src=["'](.*?)["'](.*?)>/gi;

	const handleAudioTags = function(defaultRender) {
		return function(tokens, idx, options, env, self) {
			const token = tokens[idx];
			const content = token.content;

			if (!content.match(audioRegex)) return defaultRender(tokens, idx, options, env, self);

			return content.replace(audioRegex, (v, before, src, after) => {
				if (!Resource.isResourceUrl(src)) return `<source${before}src="${src}"${after}>`;
				return renderAudioHtml(before, src, after, ruleOptions);
			});
		};
	};

	// It seems audio sometimes are inline, sometimes a block
	// to make sure they both render correctly.
	markdownIt.renderer.rules.html_block = handleAudioTags(htmlBlockDefaultRender);
	markdownIt.renderer.rules.html_inline = handleAudioTags(htmlInlineDefaultRender);
}

module.exports = function(context, ruleOptions) {
	return function(md, mdOptions) {
		installRule(md, mdOptions, ruleOptions);
	};
};
