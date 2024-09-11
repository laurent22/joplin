import { LinkRenderingType } from '../MdToHtml';
import { ItemIdToUrlHandler, OptionsResourceModel } from '../types';
import * as utils from '../utils';
import createEventHandlingAttrs from './createEventHandlingAttrs';
const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = new Entities().encode;
const urlUtils = require('../urlUtils.js');
const { getClassNameForMimeType } = require('font-awesome-filetypes');

export interface Options {
	title?: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	resources?: any;
	ResourceModel?: OptionsResourceModel;
	linkRenderingType?: LinkRenderingType;
	plainResourceRendering?: boolean;
	postMessageSyntax?: string;
	enableLongPress?: boolean;
	itemIdToUrl?: ItemIdToUrlHandler;
}

export interface LinkReplacementResult {
	html: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	resource: any;
	resourceReady: boolean;
	resourceFullPath: string;
}

export default function(href: string, {
	title = '',
	resources = {},
	ResourceModel = null,
	linkRenderingType = LinkRenderingType.JavaScriptHandler,
	plainResourceRendering = false,
	postMessageSyntax = 'postMessage',
	enableLongPress = false,
	itemIdToUrl = null,
}: Options = null): LinkReplacementResult {
	const resourceHrefInfo = urlUtils.parseResourceUrl(href);
	const isResourceUrl = resources && !!resourceHrefInfo;

	let resourceIdAttr = '';
	let icon = '';
	let hrefAttr = '#';
	let mime = '';
	let resourceId = '';
	let resource = null;
	if (isResourceUrl) {
		resourceId = resourceHrefInfo.itemId;

		const result = resources[resourceId];
		const resourceStatus = utils.resourceStatus(ResourceModel, result);

		if (result && result.item) {
			if (!title) title = result.item.title;
			mime = result.item.mime;
			resource = result.item;
		}

		if (result && resourceStatus !== 'ready' && !plainResourceRendering) {
			const icon = utils.resourceStatusFile(resourceStatus);

			return {
				resourceReady: false,
				html: `<a class="not-loaded-resource resource-status-${resourceStatus}" data-resource-id="${resourceId}">` + `<img src="data:image/svg+xml;utf8,${htmlentities(icon)}"/>`,
				resource,
				resourceFullPath: null,
			};
		} else {
			// If we are rendering a note link, we'll get here too, so in that
			// case "resourceId" would actually be the note ID.
			href = `joplin://${resourceId}`;
			if (resourceHrefInfo.hash) href += `#${resourceHrefInfo.hash}`;
			resourceIdAttr = `data-resource-id='${resourceId}'`;

			const iconType = mime ? getClassNameForMimeType(mime) : 'fa-joplin';

			// Icons are defined in lib/renderers/noteStyle using inline svg
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

	let js = `${postMessageSyntax}(${JSON.stringify(href)}, { resourceId: ${JSON.stringify(resourceId)} }); return false;`;
	if (enableLongPress && !!resourceId) {
		const onClick = `${postMessageSyntax}(${JSON.stringify(href)})`;
		js = createEventHandlingAttrs(resourceId, {
			enableLongPress: enableLongPress ?? false,
			postMessageSyntax: postMessageSyntax ?? 'void',
			enableEditPopup: false,
		}, onClick);
	} else {
		js = `onclick='${htmlentities(js)}'`;
	}

	if (hrefAttr.indexOf('#') === 0 && href.indexOf('#') === 0) js = ''; // If it's an internal anchor, don't add any JS since the webview is going to handle navigating to the right place

	const attrHtml = [];
	attrHtml.push('data-from-md');
	if (resourceIdAttr) attrHtml.push(resourceIdAttr);
	if (title) attrHtml.push(`title='${htmlentities(title)}'`);
	if (mime) attrHtml.push(`type='${htmlentities(mime)}'`);

	let resourceFullPath = resource && ResourceModel?.fullPath ? ResourceModel.fullPath(resource) : null;

	// Handle overrides
	let addedHrefAttr = false;
	if (resourceId && itemIdToUrl) {
		const url = itemIdToUrl(resourceId);
		if (url !== null) {
			attrHtml.push(`href='${htmlentities(url)}'`);
			resourceFullPath = url;
			addedHrefAttr = true;
		}
	}

	if (addedHrefAttr) {
		// Done -- the HREF has already bee set.
	} else if (plainResourceRendering || linkRenderingType === LinkRenderingType.HrefHandler) {
		icon = '';
		attrHtml.push(`href='${htmlentities(href)}'`);
	} else {
		attrHtml.push(`href='${htmlentities(hrefAttr)}'`);
	}

	if (js && linkRenderingType === LinkRenderingType.JavaScriptHandler) {
		attrHtml.push(js);
	}

	return {
		html: `<a ${attrHtml.join(' ')}>${icon}`,
		resourceReady: true,
		resource,
		resourceFullPath: resourceFullPath,
	};
}
