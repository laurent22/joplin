document.addEventListener('click', async (event) => {
	const element = event.target;
	if (element.className === 'webview-test-link') {
		event.preventDefault();
		
		console.info('webview.js: sending message');
		const response = await webviewApi.postMessage('testingWebviewMessage');
		console.info('webview.js: got response:', response);
	}
})

console.info('webview.js: registering message listener');
webviewApi.onMessage((event) => console.info('webview.js: got message:', event.message));

