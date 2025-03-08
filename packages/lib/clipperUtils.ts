// Do not import anything here -- the built version of this file is copied to packages/app-clipper's
// content_scripts folder.

function absoluteUrl(url: string) {
	if (!url) return url;
	const protocol = url.toLowerCase().split(':')[0];
	if (['http', 'https', 'file', 'data'].indexOf(protocol) >= 0) return url;

	if (url.indexOf('//') === 0) {
		return location.protocol + url;
	} else if (url[0] === '/') {
		return `${location.protocol}//${location.host}${url}`;
	} else {
		return `${baseUrl()}/${url}`;
	}
}

function pageLocationOrigin() {
	// location.origin normally returns the protocol + domain + port (eg. https://example.com:8080)
	// but for file:// protocol this is browser dependant and in particular Firefox returns "null"
	// in this case.

	if (location.protocol === 'file:') {
		return 'file://';
	} else {
		return location.origin;
	}
}

function baseUrl() {
	let output = pageLocationOrigin() + location.pathname;
	if (output[output.length - 1] !== '/') {
		const output2 = output.split('/');
		output2.pop();
		output = output2.join('/');
	}
	return output;
}

function getJoplinClipperSvgClassName(svg: SVGSVGElement) {
	for (const className of svg.classList) {
		if (className.indexOf('joplin-clipper-svg-') === 0) return className;
	}
	return '';
}

type ImageObject = {
	width: number;
	height: number;
	naturalWidth?: number;
	naturalHeight?: number;
};

export function getImageSizes(element: Document, forceAbsoluteUrls = false) {
	const output: Record<string, ImageObject[]> = {};

	const images = element.getElementsByTagName('img');
	for (let i = 0; i < images.length; i++) {
		const img = images[i];
		if (img.classList && img.classList.contains('joplin-clipper-hidden')) continue;

		let src = imageSrc(img);
		src = forceAbsoluteUrls ? absoluteUrl(src) : src;

		if (!output[src]) output[src] = [];

		output[src].push({
			width: img.width,
			height: img.height,
			naturalWidth: img.naturalWidth,
			naturalHeight: img.naturalHeight,
		});
	}

	const svgs = element.getElementsByTagName('svg');
	for (let i = 0; i < svgs.length; i++) {
		const svg = svgs[i];
		if (svg.classList && svg.classList.contains('joplin-clipper-hidden')) continue;

		const className = getJoplinClipperSvgClassName(svg);// 'joplin-clipper-svg-' + i;

		if (!className) {
			console.warn('SVG without a Joplin class:', svg);
			continue;
		}

		if (!svg.classList.contains(className)) {
			svg.classList.add(className);
		}

		const rect = svg.getBoundingClientRect();

		if (!output[className]) output[className] = [];

		output[className].push({
			width: rect.width,
			height: rect.height,
		});
	}

	return output;
}

// In general we should use currentSrc because that's the image that's currently displayed,
// especially within <picture> tags or with srcset. In these cases there can be multiple
// sources and the best one is probably the one being displayed, thus currentSrc.
function imageSrc(image: HTMLImageElement) {
	if (image.currentSrc) return image.currentSrc;
	return image.src;
}

// Given a document, return a <style> tag that contains all the styles
// required to render the page. Not currently used but could be as an
// option to clip pages as HTML.
// eslint-disable-next-line
export function getStyleSheets(doc: Document) {
	const output = [];
	for (let i = 0; i < doc.styleSheets.length; i++) {
		const sheet = doc.styleSheets[i];
		try {
			for (const cssRule of sheet.cssRules) {
				output.push({ type: 'text', value: cssRule.cssText });
			}
		} catch (error) {
			// Calling sheet.cssRules will throw a CORS error on Chrome if the stylesheet is on a different domain.
			// In that case, we skip it and add it to the list of stylesheet URLs. These URls will be downloaded
			// by the desktop application, since it doesn't have CORS restrictions.
			// eslint-disable-next-line
			console.info('Could not retrieve stylesheet now:', sheet.href);
			// eslint-disable-next-line
			console.info('It will downloaded by the main application.');
			// eslint-disable-next-line
			console.info(error);
			output.push({ type: 'url', value: sheet.href });
		}
	}
	return output;
}

// Required to run in Firefox with tabs.executeScript. See
// https://stackoverflow.com/a/44774834
// eslint-disable-next-line no-unused-expressions -- Old code before rule was applied
undefined;
