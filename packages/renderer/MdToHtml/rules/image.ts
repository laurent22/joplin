import { RuleOptions } from '../../MdToHtml';
import { attributesHtml } from '../../htmlUtils';
import utils from '../../utils';
import createEventHandlingAttrs from '../createEventHandlingAttrs';

function plugin(markdownIt: any, ruleOptions: RuleOptions) {
	const defaultRender = markdownIt.renderer.rules.image;

	markdownIt.renderer.rules.image = (tokens: any[], idx: number, options: any, env: any, self: any) => {
		const Resource = ruleOptions.ResourceModel;

		const token = tokens[idx];
		const src = utils.getAttr(token.attrs, 'src');
		const title = utils.getAttr(token.attrs, 'title');

		if (!Resource.isResourceUrl(src) || ruleOptions.plainResourceRendering) return defaultRender(tokens, idx, options, env, self);

		const r = utils.imageReplacement(ruleOptions.ResourceModel, src, ruleOptions.resources, ruleOptions.resourceBaseUrl, ruleOptions.itemIdToUrl);
		if (typeof r === 'string') return r;
		if (r) {
			const id = r['data-resource-id'];

			const js = createEventHandlingAttrs(id, {
				enableLongPress: ruleOptions.enableLongPress ?? false,
				postMessageSyntax: ruleOptions.postMessageSyntax ?? 'void',
			}, null);

			return `<img data-from-md ${attributesHtml({ ...r, title: title, alt: token.content })} ${js}/>`;
		}
		return defaultRender(tokens, idx, options, env, self);
	};
}

export default { plugin };
