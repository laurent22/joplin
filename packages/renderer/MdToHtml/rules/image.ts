import { RuleOptions } from '../../MdToHtml';
import htmlUtils from '../../htmlUtils';
import utils from '../../utils';

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
			let js = '';
			if (ruleOptions.enableLongPress) {
				const id = r['data-resource-id'];

				const longPressHandler = `${ruleOptions.postMessageSyntax}('longclick:${id}')`;
				// if t is set when ontouchstart is called it means the user has already touched the screen once and this is the 2nd touch
				// in this case we assume the user is trying to zoom and we don't want to show the menu
				const touchStart = `if (typeof(t) !== 'undefined' && !!t) { clearTimeout(t); t = null; } else { t = setTimeout(() => { t = null; ${longPressHandler}; }, ${utils.longPressDelay}); }`;
				const cancel = 'if (!!t) clearTimeout(t); t=null';

				js = ` ontouchstart="${touchStart}" ontouchend="${cancel}" ontouchcancel="${cancel}" ontouchmove="${cancel}"`;
			}
			return `<img data-from-md ${htmlUtils.attributesHtml(Object.assign({}, r, { title: title, alt: token.content }))}${js}/>`;
		}
		return defaultRender(tokens, idx, options, env, self);
	};
}

export default { plugin };
