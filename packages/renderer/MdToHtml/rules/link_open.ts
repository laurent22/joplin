import { RuleOptions } from '../../MdToHtml';
import linkReplacement from '../linkReplacement';
import * as utils from '../../utils';
import type * as MarkdownIt from 'markdown-it';
import type Token = require('markdown-it/lib/token');

const urlUtils = require('../../urlUtils.js');

function plugin(markdownIt: MarkdownIt, ruleOptions: RuleOptions) {
	markdownIt.renderer.rules.link_open = function(tokens: Token[], idx: number) {
		const token = tokens[idx];
		const href = utils.getAttr(token.attrs, 'href');
		const resourceHrefInfo = urlUtils.parseResourceUrl(href);
		const isResourceUrl = ruleOptions.resources && !!resourceHrefInfo;
		const title = utils.getAttr(token.attrs, 'title', isResourceUrl ? '' : href);

		const replacement = linkReplacement(href, {
			title,
			resources: ruleOptions.resources,
			ResourceModel: ruleOptions.ResourceModel,
			linkRenderingType: ruleOptions.linkRenderingType,
			plainResourceRendering: ruleOptions.plainResourceRendering,
			postMessageSyntax: ruleOptions.postMessageSyntax,
			enableLongPress: ruleOptions.enableLongPress,
			itemIdToUrl: ruleOptions.itemIdToUrl,
			showNoteLinkIcon: ruleOptions.showNoteLinkIcon,
		});

		ruleOptions.context.currentLinks.push({
			href: href,
			resource: replacement.resource,
			resourceReady: replacement.resourceReady,
			resourceFullPath: replacement.resourceFullPath,
		});

		return replacement.html;
	};
}

export default { plugin };
