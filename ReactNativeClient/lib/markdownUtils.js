const urlUtils = require('lib/urlUtils');

const markdownUtils = {

	// Not really escaping because that's not supported by marked.js
	escapeLinkText(text) {
		return text.replace(/(\[|\]|\(|\))/g, '_');
	},

	escapeLinkUrl(url) {
		url = url.replace(/\(/g, '%28');
		url = url.replace(/\)/g, '%29');
		return url;
	},

	prependBaseUrl(md, baseUrl) {
		return md.replace(/(\]\()([^\s\)]+)(.*?\))/g, (match, before, url, after) => {
			return before + urlUtils.prependBaseUrl(url, baseUrl) + after;
		});
	},

	extractImageUrls(md) {
		// ![some text](http://path/to/image)
		const regex = new RegExp(/!\[.*?\]\(([^\s\)]+).*?\)/, 'g')
		let match = regex.exec(md);
		const output = [];
		while (match) {
			const url = match[1];
			if (output.indexOf(url) < 0) output.push(url);
			match = regex.exec(md);
		}
		return output;
	},

};

module.exports = markdownUtils;