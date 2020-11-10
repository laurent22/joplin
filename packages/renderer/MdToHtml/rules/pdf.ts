const utils = require('../../utils');
const urlUtils = require('../../urlUtils.js');

function installRule(markdownIt:any, _mdOptions:any, ruleOptions:any, _context:any) {
	const defaultRender = markdownIt.renderer.rules.link_open;

	markdownIt.renderer.rules.link_open = function(tokens:any, idx:any) {
		const token = tokens[idx];
		const href = utils.getAttr(token.attrs, 'href');

		const resourceHrefInfo = urlUtils.parseResourceUrl(href);
		const isResourceUrl = ruleOptions.resources && !!resourceHrefInfo;
		if (!isResourceUrl) {
			return defaultRender(token, idx);
		}

		const resourceId = resourceHrefInfo.itemId;
		const result = ruleOptions.resources[resourceId];
		const resource = result ? result.item : null;
		const resourceStatus = utils.resourceStatus(ruleOptions.ResourceModel, result);

		if (resourceStatus !== 'ready') {
			return defaultRender(token, idx);
		}

		let filename = `./${ruleOptions.ResourceModel.filename(resource)}`;
		if (ruleOptions.resourceBaseUrl) {
			filename = ruleOptions.resourceBaseUrl + filename;
		}

		const mime = resource.mime ? resource.mime.toLowerCase() : '';
		if (mime === 'application/pdf') {
			return `<object data="${filename}" style="min-height:100vh;width:100%" type="${mime}"></object> ${defaultRender(tokens, idx)}`;
		} else {
			return defaultRender(tokens, idx);
		}
	};
}

export default {
	install: function(context:any, ruleOptions:any) {
		return function(md:any, mdOptions:any) {
			installRule(md, mdOptions, ruleOptions, context);
		};
	},
};
