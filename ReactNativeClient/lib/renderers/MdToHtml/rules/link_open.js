const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = new Entities().encode;
const utils = require('../../utils');
const urlUtils = require('lib/urlUtils.js');
const { shim } = require('lib/shim');
const { getClassNameForMimeType } = require('font-awesome-filetypes');

function installRule(markdownIt, mdOptions, ruleOptions) {
	markdownIt.renderer.rules.link_open = function(tokens, idx) {
		const token = tokens[idx];
		let href = utils.getAttr(token.attrs, 'href');
		const resourceHrefInfo = urlUtils.parseResourceUrl(href);
		const isResourceUrl = !!resourceHrefInfo;
		let title = utils.getAttr(token.attrs, 'title', isResourceUrl ? '' : href);

		let resourceIdAttr = '';
		let icon = '';
		let hrefAttr = '#';
		let mime = '';
		if (isResourceUrl) {
			const resourceId = resourceHrefInfo.itemId;

			const result = ruleOptions.resources[resourceId];
			const resourceStatus = utils.resourceStatus(result);

			if (result && result.item) {
				title = utils.getAttr(token.attrs, 'title', result.item.title);
				mime = result.item.mime;
			}

			if (result && resourceStatus !== 'ready') {
				const icon = utils.resourceStatusFile(resourceStatus);
				return `<a class="not-loaded-resource resource-status-${resourceStatus}" data-resource-id="${resourceId}">` + `<img src="data:image/svg+xml;utf8,${htmlentities(icon)}"/>`;
			} else {
				href = `joplin://${resourceId}`;
				if (resourceHrefInfo.hash) href += `#${resourceHrefInfo.hash}`;
				resourceIdAttr = `data-resource-id='${resourceId}'`;

				let mimeClass = getClassNameForMimeType(mime);
				let iconType = 'resource-icon';
				if (!mime) {
					mimeClass = 'fa-joplin';
				} else if (mimeClass === 'fa-file-alt') {
					// Special case where fork awesome has an icon that font awesome doesn't have
					mimeClass = 'fa-file-text-o';
				} else {
					// Fork awesome appends a -o to filetypes, I don't know why
					mimeClass = `${mimeClass}-o`;
				}
				if (shim.isReactNative()) {
					// Ideally we would use the same icons between mobile and desktop, but
					// it has proven to be quite a challenge to get the fonts working on mobile
					iconType = 'resource-icon-mobile';
				}
				icon = `<span class="${iconType} fa ${mimeClass}"></span>`;
			}
		} else {
			// If the link is a plain URL (as opposed to a resource link), set the href to the actual
			// link. This allows the link to be exported too when exporting to PDF.
			hrefAttr = href;
		}

		let js = `${ruleOptions.postMessageSyntax}(${JSON.stringify(href)}); return false;`;
		if (hrefAttr.indexOf('#') === 0 && href.indexOf('#') === 0) js = ''; // If it's an internal anchor, don't add any JS since the webview is going to handle navigating to the right place
		return `<a data-from-md ${resourceIdAttr} title='${htmlentities(title)}' href='${hrefAttr}' onclick='${js}' type='${htmlentities(mime)}'>${icon}`;
	};
}

module.exports = function(context, ruleOptions) {

	return function(md, mdOptions) {
		if (!shim.isReactNative()) {
			context.cssFiles['fork-awesome'] = '../../css/fork-awesome.min.css';
		}
		installRule(md, mdOptions, ruleOptions);
	};
};
