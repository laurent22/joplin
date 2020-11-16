import { RuleOptions } from '../../MdToHtml';

const utils = require('../../utils');
const htmlUtils = require('../../htmlUtils.js');

function plugin(markdownIt: any, ruleOptions: RuleOptions) {
	const defaultRender = markdownIt.renderer.rules.image;

	markdownIt.renderer.rules.image = (tokens: any[], idx: number, options: any, env: any, self: any) => {
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
				const id = r['data-resource-id'];

				const longPressHandler = `${ruleOptions.postMessageSyntax}('longclick:${id}')`;
				const touchStart = `t=setTimeout(()=>{t=null; ${longPressHandler};}, ${ruleOptions.longPressDelay});`;
				const cancel = 'if (!!t) clearTimeout(t); t=null';

				js = ` ontouchstart="${touchStart}" ontouchend="${cancel}" ontouchcancel="${cancel}" ontouchmove="${cancel}"`;
			}

			return `<img data-from-md ${htmlUtils.attributesHtml(Object.assign({}, r, { title: title }))}${js}/>`;
		}
		return defaultRender(tokens, idx, options, env, self);
	};
}

export default { plugin };
