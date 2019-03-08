const webviewLib = {};

webviewLib.handleInternalLink = function(event, anchorNode) {
	const href = anchorNode.getAttribute('href');
	if (href.indexOf('#') === 0) {
		event.preventDefault();
		location.hash = href;
		return true;
	}
	return false;
}

webviewLib.getParentAnchorElement = function(element) {
	let counter = 0;
	while (true) {

		if (counter++ >= 10000) {
			console.warn('been looping for too long - exiting')
			return null;
		}

		if (!element) return null;
		if (element.nodeName === 'A') return element;
		element = element.parentElement;
	}
}

webviewLib.initialize = function(options) {
	webviewLib.options_ = options;
}

document.addEventListener('click', function(event) {
	const anchor = webviewLib.getParentAnchorElement(event.target);
	if (!anchor) return;

	// Prevent URLs added via <a> tags from being opened within the application itself
	// otherwise it would open the whole website within the WebView.

	// Note that we already handle some links in html_inline.js, however not all of them
	// go through this plugin, in particular links coming from third-party packages such
	// as Katex.
	if (!anchor.hasAttribute('data-from-md')) {
		if (webviewLib.handleInternalLink(event, anchor)) return;

		event.preventDefault();
		webviewLib.options_.postMessage(anchor.getAttribute('href'));
		return;
	}

	// If this is an internal link, jump to the anchor directly
	if (anchor.hasAttribute('data-from-md')) {
		if (webviewLib.handleInternalLink(event, anchor)) return;
	}
});