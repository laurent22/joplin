// In order to give access to the webview to certain functions of the main process, we need
// this bridge which listens from the main process and sends to the webview and the other
// way around. This is necessary after having enabled the "contextIsolation" option, which
// prevents the webview from accessing low-level methods in the main process.

const ipcRenderer = require('electron').ipcRenderer;
const isUrl = require('valid-url').isWebUri;

ipcRenderer.on('setHtml', (event, html) => {
    if (isUrl(html))
    	html = '<iframe style="width:100%; height:100%; padding:0; margin:0" src="'+html+'"></iframe>';
    window.postMessage({ target: 'webview', name: 'setHtml', data: { html: html } }, '*');
});

ipcRenderer.on('clipHtml', (event, result) => {
    window.postMessage({
		target: 'webview',
		name: 'setHtml',
		data: {
            title: result.title,
            html: result.html,
            base_url: result.base_url,
		}
    }, '*');
});

ipcRenderer.on('setPercentScroll', (event, percent) => {
	window.postMessage({ target: 'webview', name: 'setPercentScroll', data: { percent: percent } }, '*');
});

ipcRenderer.on('setMarkers', (event, keywords) => {
	window.postMessage({ target: 'webview', name: 'setMarkers', data: { keywords: keywords } }, '*');
});

window.addEventListener('message', (event) => {
	// Here we only deal with messages that are sent from the webview to the main Electron process
	if (event.origin !== location.origin) return;
	console.debug("window.on message from " + event.origin, event);
	if (!event.data || event.data.target !== 'main') return;

	const callName = event.data.name;
	const args = event.data.args;
	console.log("window.on message to main: " + callName, args );

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
