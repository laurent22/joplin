document.addEventListener('click', event => {
	const element = event.target;
	if (element.className === 'toc-item-link') {
		console.debug('TOC Plugin Webview: Sending scrollToHash message', element.dataset.slug);
		webviewApi.postMessage({
			name: 'scrollToHash',
			hash: element.dataset.slug,
		});
	}
})