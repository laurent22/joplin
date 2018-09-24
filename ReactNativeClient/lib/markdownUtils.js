const urlUtils = require('lib/urlUtils');
const MarkdownIt = require('markdown-it');

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
		const markdownIt = new MarkdownIt();
		const env = {};
		const tokens = markdownIt.parse(md, env);
		const output = [];

		const searchUrls = (tokens) => {
			for (let i = 0; i < tokens.length; i++) {
				const token = tokens[i];

				if (token.type === 'image') {
					for (let j = 0; j < token.attrs.length; j++) {
						const a = token.attrs[j];
						if (a[0] === 'src' && a.length >= 2 && a[1]) {
							output.push(a[1]);
						}
					}
				}
				
				if (token.children && token.children.length) {
					searchUrls(token.children);
				}
			}
		}

		searchUrls(tokens);

		return output;
	},

	olLineNumber(line) {
		const match = line.match(/^(\d+)\.(\s.*|)$/);
		return match ? Number(match[1]) : 0;
	},

};

module.exports = markdownUtils;