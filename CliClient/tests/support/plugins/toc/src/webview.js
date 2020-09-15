document.addEventListener('click', event => {
	const element = event.target;
	if (element.className === 'toc-header') {
		webviewApi.postMessage({
			name: 'scrollToHash',
			hash: element.dataset.slug,
		});
	}
})