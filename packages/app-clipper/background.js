let browser_ = null;
if (typeof browser !== 'undefined') {
	browser_ = browser;
	browserSupportsPromises_ = true;
} else if (typeof chrome !== 'undefined') {
	browser_ = chrome;
	browserSupportsPromises_ = false;
}

let env_ = null;

// Make this function global so that it can be accessed
// from the popup too.
// https://stackoverflow.com/questions/6323184/communication-between-background-page-and-popup-page-in-a-chrome-extension
window.joplinEnv = function() {
	if (env_) return env_;

	const manifest = browser_.runtime.getManifest();
	env_ = manifest.name.indexOf('[DEV]') >= 0 ? 'dev' : 'prod';
	return env_;
};

async function browserCaptureVisibleTabs(windowId) {
	const options = {
		format: 'jpeg',

		// This is supposed to be the default quality, but in fact Firefox 82+
		// clearly uses a much lower quality, closer to 20 or 30, so we have to
		// set it here explicitely.
		// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/extensionTypes/ImageDetails
		// https://discourse.joplinapp.org/t/clip-screenshot-image-quality/12302/4
		quality: 92,
	};
	if (browserSupportsPromises_) return browser_.tabs.captureVisibleTab(windowId, options);

	return new Promise((resolve) => {
		browser_.tabs.captureVisibleTab(windowId, options, (image) => {
			resolve(image);
		});
	});
}

async function browserGetZoom(tabId) {
	if (browserSupportsPromises_) return browser_.tabs.getZoom(tabId);

	return new Promise((resolve) => {
		browser_.tabs.getZoom(tabId, (zoom) => {
			resolve(zoom);
		});
	});
}

browser_.runtime.onInstalled.addListener(function() {
	if (window.joplinEnv() === 'dev') {
		browser_.browserAction.setIcon({
			path: 'icons/32-dev.png',
		});
	}
});

async function getImageSize(dataUrl) {
	return new Promise((resolve, reject) => {
		const image = new Image();

		image.onload = function() {
			resolve({ width: image.width, height: image.height });
		};

		image.onerror = function(event) {
			reject(event);
		};

		image.src = dataUrl;
	});
}

browser_.runtime.onMessage.addListener(async (command) => {
	if (command.name === 'screenshotArea') {
		const browserZoom = await browserGetZoom();

		// The dimensions of the image returned by Firefox are the regular ones,
		// while the one returned by Chrome depend on the screen pixel ratio. So
		// it would return a 600*400 image if the window dimensions are 300x200
		// and the screen pixel ratio is 2.
		//
		// Normally we could rely on window.devicePixelRatio to tell us that but
		// since Firefox and Chrome handle this differently, we need to
		// calculate the ratio ourselves. It's simply the image dimensions
		// divided by the window inner width.
		//
		// The crop rectangle is always in real pixels, so we need to multiply
		// it by the ratio we've calculated.
		const imageDataUrl = await browserCaptureVisibleTabs(null);
		const imageSize = await getImageSize(imageDataUrl);
		const imagePixelRatio = imageSize.width / command.content.windowInnerWidth;

		const content = Object.assign({}, command.content);
		content.image_data_url = imageDataUrl;
		if ('url' in content) content.source_url = content.url;

		const ratio = browserZoom * imagePixelRatio;
		const newArea = Object.assign({}, command.content.crop_rect);
		newArea.x *= ratio;
		newArea.y *= ratio;
		newArea.width *= ratio;
		newArea.height *= ratio;
		content.crop_rect = newArea;

		fetch(`${command.api_base_url}/notes?token=${encodeURIComponent(command.token)}`, {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(content),
		});
	}
});

async function getActiveTabs() {
	const options = { active: true, currentWindow: true };
	if (browserSupportsPromises_) return browser_.tabs.query(options);

	return new Promise((resolve) => {
		browser_.tabs.query(options, (tabs) => {
			resolve(tabs);
		});
	});
}

async function sendClipMessage(clipType) {
	const tabs = await getActiveTabs();
	if (!tabs || !tabs.length) {
		console.error('No active tabs');
		return;
	}
	const tabId = tabs[0].id;
	// send a message to the content script on the active tab (assuming it's there)
	const message = {
		shouldSendToJoplin: true,
	};
	switch (clipType) {
	case 'clipCompletePage':
		message.name = 'completePageHtml';
		message.preProcessFor = 'markdown';
		break;
	case 'clipCompletePageHtml':
		message.name = 'completePageHtml';
		message.preProcessFor = 'html';
		break;
	case 'clipSimplifiedPage':
		message.name = 'simplifiedPageHtml';
		break;
	case 'clipUrl':
		message.name = 'pageUrl';
		break;
	case 'clipSelection':
		message.name = 'selectedHtml';
		break;
	default:
		break;
	}
	if (message.name) {
		browser_.tabs.sendMessage(tabId, message);
	}
}

browser_.commands.onCommand.addListener(function(command) {
	// We could enumerate these twice, but since we're in here first,
	// why not save ourselves the trouble with this convention
	if (command.startsWith('clip')) {
		sendClipMessage(command);
	}
});
