import { RuleOptions } from '../../MdToHtml';
import { attributesHtml } from '../../htmlUtils';
import * as utils from '../../utils';
import createEventHandlingAttrs from '../createEventHandlingAttrs';
import type * as MarkdownIt from 'markdown-it';
import type Token = require('markdown-it/lib/token');
import type Renderer = require('markdown-it/lib/renderer');

function plugin(markdownIt: MarkdownIt, ruleOptions: RuleOptions) {
	const defaultRender = markdownIt.renderer.rules.image;

	markdownIt.renderer.rules.image = (tokens: Token[], idx: number, options: MarkdownIt.Options, env: unknown, self: Renderer) => {
		const Resource = ruleOptions.ResourceModel;

		const token = tokens[idx];
		const src = utils.getAttr(token.attrs, 'src');
		const title = utils.getAttr(token.attrs, 'title');

		if (!Resource.isResourceUrl(src) || ruleOptions.plainResourceRendering) return defaultRender(tokens, idx, options, env, self);

		const alt = token.content;
		const r = utils.imageReplacement(ruleOptions.ResourceModel, { src, alt, title }, ruleOptions.resources, ruleOptions.resourceBaseUrl, ruleOptions.itemIdToUrl);
		if (typeof r === 'string') return r;
		if (r) {
			const id = r['data-resource-id'];

			// Show the edit popup if any MIME type matches that in editPopupFiletypes
			const mimeType = ruleOptions.resources[id]?.item?.mime?.toLowerCase();
			const enableEditPopup = ruleOptions.editPopupFiletypes?.some(showForMime => mimeType === showForMime);

			const js = createEventHandlingAttrs(id, {
				enableLongPress: ruleOptions.enableLongPress ?? false,
				postMessageSyntax: ruleOptions.postMessageSyntax ?? 'void',

				enableEditPopup,
				createEditPopupSyntax: ruleOptions.createEditPopupSyntax,
				destroyEditPopupSyntax: ruleOptions.destroyEditPopupSyntax,
			}, null);

			return `<img data-from-md ${attributesHtml({ ...r, title: title, alt })} ${js}/>`;
		}
		return defaultRender(tokens, idx, options, env, self);
	};
}

export default { plugin };
