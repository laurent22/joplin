import { RuleOptions } from '../../MdToHtml';
import { attributesHtml } from '../../htmlUtils';
import * as utils from '../../utils';
import type * as MarkdownIt from 'markdown-it';
import type Renderer = require('markdown-it/lib/renderer');

function renderImageHtml(before: string, src: string, after: string, ruleOptions: RuleOptions) {
	const r = utils.imageReplacement(ruleOptions.ResourceModel, { src, before, after }, ruleOptions.resources, ruleOptions.resourceBaseUrl, ruleOptions.itemIdToUrl);
	if (typeof r === 'string') return r;
	if (r) return `<img ${before} ${attributesHtml(r)} ${after}/>`;
	return `[Image: ${src}]`;
}

function plugin(markdownIt: MarkdownIt, ruleOptions: RuleOptions) {
	const Resource = ruleOptions.ResourceModel;

	const htmlBlockDefaultRender: Renderer.RenderRule =
		markdownIt.renderer.rules.html_block ||
		function(tokens, idx, options, _env, self) {
			return self.renderToken(tokens, idx, options);
		};

	const htmlInlineDefaultRender: Renderer.RenderRule =
		markdownIt.renderer.rules.html_inline ||
		function(tokens, idx, options, _env, self) {
			return self.renderToken(tokens, idx, options);
		};

	const imageRegex = /<img(.*?)src=["'](.*?)["'](.*?)>/gi;

	const handleImageTags = function(defaultRender: Renderer.RenderRule): Renderer.RenderRule {
		return function(tokens, idx, options, env, self) {
			const token = tokens[idx];
			const content = token.content;

			if (!content.match(imageRegex)) return defaultRender(tokens, idx, options, env, self);

			return content.replace(imageRegex, (_v: string, before: string, src: string, after: string) => {
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

export default { plugin };
