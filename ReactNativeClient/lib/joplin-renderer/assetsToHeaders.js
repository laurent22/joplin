// Utility function to convert the plugin assets to a list of LINK or SCRIPT tags
// that can be included in the HEAD tag.
function assetsToHeaders(pluginAssets, options = null) {
	options = Object.assign({}, { asHtml: false }, options);

	const headers = {};
	for (let i = 0; i < pluginAssets.length; i++) {
		const asset = pluginAssets[i];
		if (asset.mime === 'text/css') {
			headers[asset.name] = `<link rel="stylesheet" href="pluginAssets/${asset.name}">`;
		} else if (asset.mime === 'application/javascript') {
			// NOT TESTED!!
			headers[asset.name] = `<script type="application/javascript" src="pluginAssets/${asset.name}"></script>`;
		}
	}

	if (options.asHtml) {
		let output = [];
		for (let name in headers) {
			output.push(headers[name]);
		}
		return output.join('');
	}

	return headers;
}

module.exports = assetsToHeaders;
