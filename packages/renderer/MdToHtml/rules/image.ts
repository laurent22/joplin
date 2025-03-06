import { RuleOptions } from '../../MdToHtml';
import { attributesHtml } from '../../htmlUtils';
import * as utils from '../../utils';
import createEventHandlingAttrs from '../createEventHandlingAttrs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function plugin(markdownIt: any, ruleOptions: RuleOptions) {
	const defaultRender = markdownIt.renderer.rules.image;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	markdownIt.renderer.rules.image = (tokens: any[], idx: number, options: any, env: any, self: any) => {
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
