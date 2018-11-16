const fs = require('fs');
const path = require('path');
const {ipcRenderer} = require('electron');

function getContentScript(name) {
	const scriptPath = path.join(__dirname, '..', 'content_scripts', name + '.js');
	return fs.readFileSync(scriptPath).toString('utf-8');
}
const JSDOMParser_js = getContentScript('JSDOMParser');
const Readablility_js= getContentScript('Readability');
const webclipper_js = getContentScript('webclipper');

function attachWebviewIpcMessage(webview, url) {
	if (!webview) webview = document.getElementById("webview");
	const URL = url;
	const ipcEventHandler = (event) => {
		console.log("on ipc-message: " + event.channel + " " + event.args);
		ipcRenderer.send(event.channel, event.args);
	};
	webview.addEventListener("ipc-message", ipcEventHandler);
}
function attachWebviewDOMReadyEvent(webview, url) {
	if (!webview) webview = document.getElementById("webview");
	const webContents = webview.getWebContents();
	webview.addEventListener("did-start-loading", (event) => {
		console.log("on did-start-loading " + url);
		const webContents = webview.getWebContents();
		//webContents.openDevTools();
	});
	webview.addEventListener("dom-ready", (event) => {
		console.log("on dom-ready " + url);
		const webContents = webview.getWebContents();
		webContents.executeJavaScript('console.log("start JSDOMParser");');
		webContents.executeJavaScript(''
			+ 'console.debug("start JSDOMParser");' + JSDOMParser_js + '\n'
			+ 'console.debug("start Readablility");' + Readablility_js + '\n'
			+ 'console.debug("start webclipper");' + webclipper_js + '\n'
			+ 'console.debug("done  webclipper");' , () => {
					console.debug('executeJavaScript done for ' + url );
		});
	});
}

ipcRenderer.on('webclipper', (event, args) => {
	console.log("ipcRenderer on webclipper " + args.type
		+ ' ' + args.id + ' ' + args.value, event);
	if (args.type === 'loadURL') {
		const url = args.value;
		document.body.innerHTML = '<webview id=webview style="width:100%; height:100%" src="' + url + '" preload="clipper-preload.js" />'
		attachWebviewIpcMessage(webview, url);
		attachWebviewDOMReadyEvent(webview, url);
	} else if (args.type === 'attachIpcMessage') {
		const webview = document.getElementById("webview");
	} if (args.type === 'stopWebview') {
		document.body.innerHTML = '';
	}
});

