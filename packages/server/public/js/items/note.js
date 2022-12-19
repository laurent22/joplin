/* global joplinNoteViewer */

function addPluginAssets(appBaseUrl, assets) {
	if (!assets) return;

	const pluginAssetsContainer = document.getElementById('joplin-container-pluginAssetsContainer');

	for (let i = 0; i < assets.length; i++) {
		const asset = assets[i];

		if (asset.mime === 'application/javascript') {
			const script = document.createElement('script');
			script.src = `${appBaseUrl}/js/${asset.path}`;
			pluginAssetsContainer.appendChild(script);
		} else if (asset.mime === 'text/css') {
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = `${appBaseUrl}/css/${asset.path}`;
			pluginAssetsContainer.appendChild(link);
		}
	}
}

function docReady(fn) {
	if (document.readyState === 'complete' || document.readyState === 'interactive') {
		setTimeout(fn, 1);
	} else {
		document.addEventListener('DOMContentLoaded', fn);
	}
}

docReady(() => {
	addPluginAssets(joplinNoteViewer.appBaseUrl, joplinNoteViewer.pluginAssets);

	// document.addEventListener('click', event => {
	// 	const element = event.target;

	// 	// Detects if it's a note link and, if so, display a message
	// 	if (element && element.getAttribute('href') === '#' && element.getAttribute('data-resource-id')) {
	// 		event.preventDefault();
	// 		alert('This note has not been shared');
	// 	}
	// });
});
