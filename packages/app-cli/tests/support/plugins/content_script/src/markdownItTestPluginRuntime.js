const addClickHandlers = () => {
	const postMessageLinks = document.querySelectorAll('.post-message-link');
	for (const link of postMessageLinks) {
		const contentScriptId = link.getAttribute('data-content-script-id');
		link.onclick = async () => {
			const response = await webviewApi.postMessage(contentScriptId, 'justtesting');
			link.textContent = 'Got response in content script: ' + response;
		};
	}
};

document.addEventListener('joplin-noteDidUpdate', () => {
	addClickHandlers();
});
