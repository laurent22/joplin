import { RuleOptions } from '../../MdToHtml';
import linkReplacement from '../linkReplacement';
import utils from '../../utils';

const urlUtils = require('../../urlUtils.js');

function plugin(markdownIt: any, ruleOptions: RuleOptions) {
	markdownIt.renderer.rules.link_open = function(tokens: any[], idx: number) {
		const token = tokens[idx];
		const href = utils.getAttr(token.attrs, 'href');
		const resourceHrefInfo = urlUtils.parseResourceUrl(href);
		const isResourceUrl = ruleOptions.resources && !!resourceHrefInfo;
		const title = utils.getAttr(token.attrs, 'title', isResourceUrl ? '' : href);

		return linkReplacement(href, {
			title,
			resources: ruleOptions.resources,
			ResourceModel: ruleOptions.ResourceModel,
			linkRenderingType: ruleOptions.linkRenderingType,
			plainResourceRendering: ruleOptions.plainResourceRendering,
			postMessageSyntax: ruleOptions.postMessageSyntax,
			enableLongPress: ruleOptions.enableLongPress,
		});
	};
}

export default { plugin };
