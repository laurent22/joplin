const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = (new Entities()).encode;
const Resource = require('lib/models/Resource.js');
const utils = require('../utils');

const loaderImage = '<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.0" width="16px" height="16px" viewBox="0 0 128 128" xml:space="preserve"><g><circle cx="16" cy="64" r="16" fill="#000000" fill-opacity="1"/><circle cx="16" cy="64" r="16" fill="#555555" fill-opacity="0.67" transform="rotate(45,64,64)"/><circle cx="16" cy="64" r="16" fill="#949494" fill-opacity="0.42" transform="rotate(90,64,64)"/><circle cx="16" cy="64" r="16" fill="#cccccc" fill-opacity="0.2" transform="rotate(135,64,64)"/><circle cx="16" cy="64" r="16" fill="#e1e1e1" fill-opacity="0.12" transform="rotate(180,64,64)"/><circle cx="16" cy="64" r="16" fill="#e1e1e1" fill-opacity="0.12" transform="rotate(225,64,64)"/><circle cx="16" cy="64" r="16" fill="#e1e1e1" fill-opacity="0.12" transform="rotate(270,64,64)"/><circle cx="16" cy="64" r="16" fill="#e1e1e1" fill-opacity="0.12" transform="rotate(315,64,64)"/><animateTransform attributeName="transform" type="rotate" values="0 64 64;315 64 64;270 64 64;225 64 64;180 64 64;135 64 64;90 64 64;45 64 64" calcMode="discrete" dur="720ms" repeatCount="indefinite"></animateTransform></g></svg>';

function installRule(markdownIt, mdOptions, ruleOptions) {
	markdownIt.renderer.rules.link_open = function (tokens, idx, options, env, self) {
		const token = tokens[idx];
		let href = utils.getAttr(token.attrs, 'href');
		const text = utils.getAttr(token.attrs, 'text');
		const isResourceUrl = Resource.isResourceUrl(href);
		const title = isResourceUrl ? utils.getAttr(token.attrs, 'title') : href;
		
		let resourceIdAttr = "";
		let icon = "";
		let hrefAttr = '#';
		if (isResourceUrl) {
			const resourceId = Resource.pathToId(href);

			const result = ruleOptions.resources[resourceId];
			const resource = result ? result.item : null;
			const resourceStatus = utils.resourceStatus(result);

			if (result && resourceStatus !== 'ready') {
				const icon = utils.resourceStatusFile(resourceStatus);
				return '<a class="not-loaded-resource resource-status-' + resourceStatus + '" data-resource-id="' + resourceId + '">' + '<img src="data:image/svg+xml;utf8,' + htmlentities(icon) + '"/>';
			} else {
				href = "joplin://" + resourceId;
				resourceIdAttr = "data-resource-id='" + resourceId + "'";
				icon = '<span class="resource-icon"></span>';
			}
		} else {
			// If the link is a plain URL (as opposed to a resource link), set the href to the actual
			// link. This allows the link to be exported too when exporting to PDF. 
			hrefAttr = href;
		}

		let js = ruleOptions.postMessageSyntax + "(" + JSON.stringify(href) + "); return false;";
		if (hrefAttr.indexOf('#') === 0 && href.indexOf('#') === 0) js = ''; // If it's an internal anchor, don't add any JS since the webview is going to handle navigating to the right place
		return "<a data-from-md " + resourceIdAttr + " title='" + htmlentities(title) + "' href='" + hrefAttr + "' onclick='" + js + "'>" + icon;
	};
}

module.exports = function(context, ruleOptions) {
	return function(md, mdOptions) {
		installRule(md, mdOptions, ruleOptions);
	};
};