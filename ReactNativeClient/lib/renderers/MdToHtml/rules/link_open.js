const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = new Entities().encode;
const utils = require('../../utils');
const urlUtils = require('lib/urlUtils.js');

function installRule(markdownIt, mdOptions, ruleOptions) {
	markdownIt.renderer.rules.link_open = function(tokens, idx, options, env, self) {
		const token = tokens[idx];
		let href = utils.getAttr(token.attrs, 'href');
		const resourceHrefInfo = urlUtils.parseResourceUrl(href);
		const isResourceUrl = !!resourceHrefInfo.itemId;
		const title = isResourceUrl ? utils.getAttr(token.attrs, 'title') : href;

		let resourceIdAttr = '';
		let icon = '';
		let hrefAttr = '#';
		if (isResourceUrl) {
			const resourceId = resourceHrefInfo.itemId;

			const result = ruleOptions.resources[resourceId];
			const resourceStatus = utils.resourceStatus(result);

			if (result && resourceStatus !== 'ready') {
				const icon = utils.resourceStatusFile(resourceStatus);
				return '<a class="not-loaded-resource resource-status-' + resourceStatus + '" data-resource-id="' + resourceId + '">' + '<img src="data:image/svg+xml;utf8,' + htmlentities(icon) + '"/>';
			} else {
				href = 'joplin://' + resourceId;
				if (resourceHrefInfo.hash) href += '#' + resourceHrefInfo.hash;
				resourceIdAttr = 'data-resource-id=\'' + resourceId + '\'';
				icon = '<span class="resource-icon"></span>';
			}
		} else {
			// If the link is a plain URL (as opposed to a resource link), set the href to the actual
			// link. This allows the link to be exported too when exporting to PDF.
			hrefAttr = href;
		}

		let js = ruleOptions.postMessageSyntax + '(' + JSON.stringify(href) + '); return false;';
		if (hrefAttr.indexOf('#') === 0 && href.indexOf('#') === 0) js = ''; // If it's an internal anchor, don't add any JS since the webview is going to handle navigating to the right place
		return '<a data-from-md ' + resourceIdAttr + ' title=\'' + htmlentities(title) + '\' href=\'' + hrefAttr + '\' onclick=\'' + js + '\'>' + icon;
	};
}

module.exports = function(context, ruleOptions) {
	return function(md, mdOptions) {
		installRule(md, mdOptions, ruleOptions);
	};
};
