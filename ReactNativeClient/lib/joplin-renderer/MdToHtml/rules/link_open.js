const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = new Entities().encode;
const utils = require('../../utils');
const urlUtils = require('../../urlUtils.js');
const { getClassNameForMimeType } = require('font-awesome-filetypes');

function installRule(markdownIt, mdOptions, ruleOptions) {
	const pluginOptions = {
		// linkRenderingType = 1 is the regular rendering and clicking on it is handled via embedded JS (in onclick attribute)
		// linkRenderingType = 2 gives a plain link with no JS. Caller needs to handle clicking on the link.
		linkRenderingType: 1,
		...ruleOptions.plugins['link_open'],
	};

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
		let resourceId = null;
		if (isResourceUrl) {
			resourceId = resourceHrefInfo.itemId;

			const result = ruleOptions.resources[resourceId];
			const resourceStatus = utils.resourceStatus(ruleOptions.ResourceModel, result);

			if (result && result.item) {
				title = utils.getAttr(token.attrs, 'title', result.item.title);
				mime = result.item.mime;
			}

			if (result && resourceStatus !== 'ready' && !ruleOptions.plainResourceRendering) {
				const icon = utils.resourceStatusFile(resourceStatus);
				return `<a class="not-loaded-resource resource-status-${resourceStatus}" data-resource-id="${resourceId}">` + `<img src="data:image/svg+xml;utf8,${htmlentities(icon)}"/>`;
			} else {
				href = `joplin://${resourceId}`;
				if (resourceHrefInfo.hash) href += `#${resourceHrefInfo.hash}`;
				resourceIdAttr = `data-resource-id='${resourceId}'`;

				let iconType = getClassNameForMimeType(mime);
				if (!mime) {
					iconType = 'fa-joplin';
				}
				// Icons are defined in lib/renderers/noteStyle.js using inline svg
				// The icons are taken from fork-awesome but use the font-awesome naming scheme in order
				// to be more compatible with the getClass library
				icon = `<span class="resource-icon ${iconType}"></span>`;
			}
		} else {
			// If the link is a plain URL (as opposed to a resource link), set the href to the actual
			// link. This allows the link to be exported too when exporting to PDF.
			hrefAttr = href;
		}

		// A single quote is valid in a URL but we don't want any because the
		// href is already enclosed in single quotes.
		// https://github.com/laurent22/joplin/issues/2030
		href = href.replace(/'/g, '%27');

		let js = '';
		if (!ruleOptions.enableLongPress) {
			js = `onclick='${ruleOptions.postMessageSyntax}(${JSON.stringify(href)}); return false;'`;
		} else if (resourceId) {
			const longPressDelay = ruleOptions.longPressDelay ? ruleOptions.longPressDelay : 500;

			const onClick = `${ruleOptions.postMessageSyntax}(${JSON.stringify(href)})`;
			const onLongClick = `${ruleOptions.postMessageSyntax}("longclick:${resourceId}")`;

			const touchStart = `t=setTimeout(()=>{t=null; ${onLongClick};}, ${longPressDelay});`;
			const touchEnd = `if (!!t) {clearTimeout(t); t=null; ${onClick};}`;

			js = `ontouchstart='${touchStart}' ontouchend='${touchEnd}'`;
		}

		if (hrefAttr.indexOf('#') === 0 && href.indexOf('#') === 0) js = ''; // If it's an internal anchor, don't add any JS since the webview is going to handle navigating to the right place

		if (ruleOptions.plainResourceRendering || pluginOptions.linkRenderingType === 2) {
			return `<a data-from-md ${resourceIdAttr} title='${htmlentities(title)}' href='${htmlentities(href)}' type='${htmlentities(mime)}'>`;
		} else {
			return `<a data-from-md ${resourceIdAttr} title='${htmlentities(title)}' href='${hrefAttr}' ${js} type='${htmlentities(mime)}'>${icon}`;
		}
	};
}

module.exports = function(context, ruleOptions) {

	return function(md, mdOptions) {
		installRule(md, mdOptions, ruleOptions);
	};
};
