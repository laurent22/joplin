document.addEventListener('click', async (event) => {
	const element = event.target;
	if (element.className === 'webview-test-link') {
		event.preventDefault();
		
		console.info('webview.js: sending message');
		const response = await webviewApi.postMessage('testingWebviewMessage');
		console.info('webiew.js: got response:', response);
	}
})