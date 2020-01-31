// Utility function to convert the plugin assets to a list of LINK or SCRIPT tags
// that can be included in the HEAD tag.
function assetsToHeaders(pluginAssets) {
	const headers = [];
	for (let i = 0; i < pluginAssets.length; i++) {
		const asset = pluginAssets[i];
		if (asset.mime === 'text/css') {
			headers.push(`<link rel="stylesheet" href="pluginAssets/${asset.name}">`);
		} else if (asset.mime === 'application/javascript') {
			// NOT TESTED!!
			headers.push(`<script type="application/javascript" src="pluginAssets/${asset.name}"></script>`);
		}
	}

	return headers.join('\n');
}

module.exports = assetsToHeaders;
