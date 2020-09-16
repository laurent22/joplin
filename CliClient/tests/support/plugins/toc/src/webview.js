document.addEventListener('click', event => {
	const element = event.target;
	if (element.className === 'toc-item-link') {
		webviewApi.postMessage({
			name: 'scrollToHash',
			hash: element.dataset.slug,
		});
	}
})