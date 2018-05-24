let browser_ = null;
if (typeof browser !== 'undefined') {
	browser_ = browser;
	browserSupportsPromises_ = true;
} else if (typeof chrome !== 'undefined') {
	browser_ = chrome;
	browserSupportsPromises_ = false;
}

async function browserCaptureVisibleTabs(windowId, options) {
	return new Promise((resolve, reject) => {
		if (browserSupportsPromises_) return browser_.tabs.captureVisibleTab(null, { format: 'jpeg' });

		browser_.tabs.captureVisibleTab(null, { format: 'jpeg' }, (image) => {
			resolve(image);
		});
	});
}

chrome.runtime.onInstalled.addListener(function() {

});

browser_.runtime.onMessage.addListener((command) => {
	if (command.name === 'screenshotArea') {
		browserCaptureVisibleTabs(null, { format: 'jpeg' }).then((image) => {
			content = Object.assign({}, command.content);
			content.imageBase64 = image;

			fetch(command.apiBaseUrl + "/notes", {
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