function pregQuote(str, delimiter = '') {
	return (`${str}`).replace(new RegExp(`[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\${delimiter || ''}-]`, 'g'), '\\$&');
}

function replaceRegexDiacritics(regexString) {
	if (!regexString) return '';

	const diacriticReplacements = {
		a: '[aàáâãäåāą]',
		A: '[AÀÁÂÃÄÅĀĄ]',
		c: '[cçćč]',
		C: '[CÇĆČ]',
		d: '[dđď]',
		D: '[DĐĎ]',
		e: '[eèéêëěēę]',
		E: '[EÈÉÊËĚĒĘ]',
		i: '[iìíîïī]',
		I: '[IÌÍÎÏĪ]',
		l: '[lł]',
		L: '[LŁ]',
		n: '[nñňń]',
		N: '[NÑŇŃ]',
		o: '[oòóôõöøō]',
		O: '[OÒÓÔÕÖØŌ]',
		r: '[rř]',
		R: '[RŘ]',
		s: '[sšś]',
		S: '[SŠŚ]',
		t: '[tť]',
		T: '[TŤ]',
		u: '[uùúûüůū]',
		U: '[UÙÚÛÜŮŪ]',
		y: '[yÿý]',
		Y: '[YŸÝ]',
		z: '[zžżź]',
		Z: '[ZŽŻŹ]',
	};

	let output = '';
	for (let i = 0; i < regexString.length; i++) {
		const c = regexString[i];
		const r = diacriticReplacements[c];
		if (r) {
			output += r;
		} else {
			output += c;
		}
	}

	return output;
}

if (typeof module !== 'undefined') {
	module.exports = { pregQuote, replaceRegexDiacritics };
}

const markJsUtils = {};

markJsUtils.markKeyword = (mark, keyword, stringUtils, extraOptions = null) => {
	if (typeof keyword === 'string') {
		keyword = {
			type: 'text',
			value: keyword,
		};
	}

	const isBasicSearch = ['ja', 'zh', 'ko'].indexOf(keyword.scriptType) >= 0;

	let value = keyword.value;
	let accuracy = keyword.accuracy ? keyword.accuracy : { value: 'exactly', limiters: ':;.,-–—‒_(){}[]!\'"+='.split('') };
	if (isBasicSearch) accuracy = 'partially';
	if (keyword.type === 'regex') {
		accuracy = 'complementary';
		// Remove the trailing wildcard and "accuracy = complementary" will take care of
		// highlighting the relevant keywords.

		// Known bug: it will also highlight word that contain the term as a suffix for example for "ent*", it will highlight "present"
		// which is incorrect (it should only highlight what starts with "ent") but for now will do. Mark.js doesn't have an option
		// to tweak this behaviour.
		value = keyword.value.substr(0, keyword.value.length - 1);
	}

	mark.mark(
		[value],
		Object.assign(
			{},
			{
				accuracy: accuracy,
			},
			extraOptions
		)
	);
};

if (typeof module !== 'undefined') {
	module.exports = markJsUtils;
}

const webviewLib = {};

let manualDownloadResourceElements = [];

webviewLib.onUnloadedResourceClick = function(event) {
	const resourceId = event.currentTarget.getAttribute('data-resource-id');
	webviewLib.options_.postMessage(`markForDownload:${resourceId}`);
};

webviewLib.setupResourceManualDownload = function() {
	for (const element of manualDownloadResourceElements) {
		element.style.cursor = 'default';
		element.removeEventListener('click', webviewLib.onUnloadedResourceClick);
	}

	manualDownloadResourceElements = [];

	const elements = document.getElementsByClassName('resource-status-notDownloaded');

	for (const element of elements) {
		element.style.cursor = 'pointer';
		element.addEventListener('click', webviewLib.onUnloadedResourceClick);
		manualDownloadResourceElements.push(element);
	}
};

webviewLib.handleInternalLink = function(event, anchorNode) {
	const href = anchorNode.getAttribute('href');
	if (!href) return false;

	if (href.indexOf('#') === 0) {
		event.preventDefault();
		// let old_hash = location.hash;

		location.hash = href;

		// HACK
		// For some reason anchors at the bottom cause the webview to move itself
		// so that the content is aligned with the top of the screen
		// This basically refreshes the scroll view so that is returns to a normal
		// position, the scroll positions stays correct though
		// Additionally an anchor could not be clicked twice because the location
		// would not change, this fixes that also
		//
		// Commented out to fix https://github.com/laurent22/joplin/issues/2141
		// We might need to fix a better fix to the previous bug.
		//
		// setTimeout(function() {
		// 	location.hash = old_hash;
		// }, 10);
		return true;
	}

	return false;
};

webviewLib.getParentAnchorElement = function(element) {
	let counter = 0;
	while (true) {
		if (counter++ >= 10000) {
			console.warn('been looping for too long - exiting');
			return null;
		}

		if (!element) return null;
		if (element.nodeName.toUpperCase() === 'A') return element;
		element = element.parentElement;
	}
};

webviewLib.cloneError = function(error) {
	return {
		message: error.message,
		stack: error.stack,
	};
};

webviewLib.logEnabledEventHandler = function(fn) {
	return function(event) {
		try {
			return fn(event);
		} catch (error) {
			webviewLib.options_.postMessage(`error:${JSON.stringify(webviewLib.cloneError(error))}`);
			throw error;
		}
	};
};

webviewLib.initialize = function(options) {
	webviewLib.options_ = options;
};

document.addEventListener('click', function(event) {
	const anchor = webviewLib.getParentAnchorElement(event.target);
	if (!anchor) return;

	// Prevent URLs added via <a> tags from being opened within the application itself
	// otherwise it would open the whole website within the WebView.

	// Note that we already handle some links in html_inline.js, however not all of them
	// go through this plugin, in particular links coming from third-party packages such
	// as Katex or Mermaid.
	if (!anchor.hasAttribute('data-from-md')) {
		if (webviewLib.handleInternalLink(event, anchor)) return;
		event.preventDefault();
		if (anchor.getAttribute('href')) webviewLib.options_.postMessage(anchor.getAttribute('href'));
		// Depending on the chart type, the generated SVG contains an anchor element with xlink:href attribute.
		if (anchor.getAttribute('xlink:href')) webviewLib.options_.postMessage(anchor.getAttribute('xlink:href'));
		return;
	}

	// If this is an internal link, jump to the anchor directly
	if (anchor.hasAttribute('data-from-md')) {
		if (webviewLib.handleInternalLink(event, anchor)) return;
	}
});
