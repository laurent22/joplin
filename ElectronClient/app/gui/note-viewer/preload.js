// In order to give access to the webview to certain functions of the main process, we need
// this bridge which listens from the main process and sends to the webview and the other
// way around. This is necessary after having enabled the "contextIsolation" option, which
// prevents the webview from accessing low-level methods in the main process.

const ipcRenderer = require('electron').ipcRenderer;

ipcRenderer.on('setHtml', (event, html, options) => {
	window.postMessage({ target: 'webview', name: 'setHtml', data: { html: html, options: options } }, '*');
});

ipcRenderer.on('setPercentScroll', (event, percent) => {
	window.postMessage({ target: 'webview', name: 'setPercentScroll', data: { percent: percent } }, '*');
});

ipcRenderer.on('setMarkers', (event, keywords, options) => {
	window.postMessage({ target: 'webview', name: 'setMarkers', data: { keywords: keywords, options: options } }, '*');
});

window.addEventListener('message', (event) => {
	// Here we only deal with messages that are sent from the webview to the main Electron process
	if (!event.data || event.data.target !== 'main') return;

	const callName = event.data.name;
	const args = event.data.args;

	// HACK 
	// For some reason anchors at the bottom cause the webview to move itself
	// so that the content is aligned with the top of the screen
	// This basically refreshes the scroll view so that is returns to a normal
	// position, the scroll positions stays correct though
	if (callName === "percentScroll" && args[0] === 1)
		location.hash = location.hash.split('#')[0]

	if (args.length === 0) {
		ipcRenderer.sendToHost(callName);
	} else if (args.length === 1) {
		ipcRenderer.sendToHost(callName, args[0]);
	} else if (args.length === 2) {
		ipcRenderer.sendToHost(callName, args[1]);
	} else {
		throw new Error('Unsupported number of args');
	}
});
