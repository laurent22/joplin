const stringPadding = require('string-padding');
const urlUtils = require('lib/urlUtils');
const MarkdownIt = require('markdown-it');
const { setupLinkify } = require('lib/joplin-renderer');

const markdownUtils = {
	// Not really escaping because that's not supported by marked.js
	escapeLinkText(text) {
		return text.replace(/(\[|\]|\(|\))/g, '_');
	},

	// Titles for markdown links only need escaping for [ and ]
	escapeTitleText(text) {
		return text.replace(/(\[|\])/g, '\\$1');
	},

	escapeLinkUrl(url) {
		url = url.replace(/\(/g, '%28');
		url = url.replace(/\)/g, '%29');
		return url;
	},

	prependBaseUrl(md, baseUrl) {
		// eslint-disable-next-line no-useless-escape
		return md.replace(/(\]\()([^\s\)]+)(.*?\))/g, (match, before, url, after) => {
			return before + urlUtils.prependBaseUrl(url, baseUrl) + after;
		});
	},

	extractImageUrls(md) {
		const markdownIt = new MarkdownIt();
		setupLinkify(markdownIt); // Necessary to support file:/// links

		const env = {};
		const tokens = markdownIt.parse(md, env);
		const output = [];

		const searchUrls = tokens => {
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
		};

		searchUrls(tokens);

		return output;
	},

	olLineNumber(line) {
		const match = line.match(/^(\d+)\.(\s.*|)$/);
		return match ? Number(match[1]) : 0;
	},

	createMarkdownTable(headers, rows) {
		const output = [];

		const headersMd = [];
		const lineMd = [];
		for (let i = 0; i < headers.length; i++) {
			const h = headers[i];
			headersMd.push(stringPadding(h.label, 3, ' ', stringPadding.RIGHT));
			lineMd.push('---');
		}

		output.push(headersMd.join(' | '));
		output.push(lineMd.join(' | '));

		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			const rowMd = [];
			for (let j = 0; j < headers.length; j++) {
				const h = headers[j];
				const value = h.filter ? h.filter(row[h.name]) : row[h.name];
				rowMd.push(stringPadding(value, 3, ' ', stringPadding.RIGHT));
			}
			output.push(rowMd.join(' | '));
		}

		return output.join('\n');
	},

	titleFromBody(body) {
		if (!body) return '';
		const mdLinkRegex = /!?\[([^\]]+?)\]\(.+?\)/g;
		const emptyMdLinkRegex = /!?\[\]\((.+?)\)/g;
		const filterRegex = /^[# \n\t*`-]*/;
		const lines = body.trim().split('\n');
		const title = lines[0].trim();
		return title.replace(filterRegex, '').replace(mdLinkRegex, '$1').replace(emptyMdLinkRegex, '$1').substring(0,80);
	},
};

module.exports = markdownUtils;
