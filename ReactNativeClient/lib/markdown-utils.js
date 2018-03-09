const markdownUtils = {
	// Not really escaping because that's not supported by marked.js
	escapeLinkText(text) {
		return text.replace(/(\[|\]|\(|\))/g, "_");
	},

	escapeLinkUrl(url) {
		url = url.replace(/\(/g, "%28");
		url = url.replace(/\)/g, "%29");
		return url;
	},
};

module.exports = { markdownUtils };
