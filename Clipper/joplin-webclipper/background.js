let browser_ = null;
let browserName_ = null;
if (typeof browser !== 'undefined') {
	browser_ = browser;
	browserSupportsPromises_ = true;
	browserName_ = 'firefox';
} else if (typeof chrome !== 'undefined') {
	browser_ = chrome;
	browserSupportsPromises_ = false;
	browserName_ = 'chrome';
}

let env_ = null;

// Make this function global so that it can be accessed
// from the popup too.
// https://stackoverflow.com/questions/6323184/communication-between-background-page-and-popup-page-in-a-chrome-extension
window.joplinEnv = function() {
	if (env_) return env_;

	env_ = !('update_url' in browser_.runtime.getManifest()) ? 'dev' : 'prod';
	return env_;
}

async function browserCaptureVisibleTabs(windowId, options) {
	if (browserSupportsPromises_) return browser_.tabs.captureVisibleTab(windowId, { format: 'jpeg' });

	return new Promise((resolve, reject) => {
		browser_.tabs.captureVisibleTab(windowId, { format: 'jpeg' }, (image) => {
			resolve(image);
		});
	});
}

browser_.runtime.onInstalled.addListener(function(details) {
	if (details && details.temporary) {
		// In Firefox - https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/runtime/onInstalled
		env_ = 'dev';
	} else if (browserName_ === 'chrome') {
		// In Chrome
		env_ = !('update_url' in browser_.runtime.getManifest()) ? 'dev' : 'prod';
	} else {
		// If we don't know, be safe and default to prod
		env_ = 'prod';
	}

	if (window.joplinEnv() === 'dev') {
		browser_.browserAction.setIcon({
			path: 'icons/32-dev.png',
		});
	}
});

browser_.runtime.onMessage.addListener((command) => {
	if (command.name === 'screenshotArea') {
		browserCaptureVisibleTabs(null, { format: 'jpeg' }).then((imageDataUrl) => {
			content = Object.assign({}, command.content);
			content.image_data_url = imageDataUrl;

			fetch(command.api_base_url + "/notes", {
				method: "POST",
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(content)
			});
		});
	}
});
