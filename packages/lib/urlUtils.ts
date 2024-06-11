import { rtrimSlashes, toFileProtocolPath } from './path-utils';
import { urlDecode } from './string-utils';

export const hash = (url: string) => {
	const s = url.split('#');
	if (s.length <= 1) return '';
	return s[s.length - 1];
};

export const urlWithoutPath = (url: string) => {
	const parsed = require('url').parse(url, true);
	return `${parsed.protocol}//${parsed.host}`;
};

export const urlProtocol = (url: string) => {
	if (!url) return '';
	const parsed = require('url').parse(url, true);
	return parsed.protocol;
};

export const prependBaseUrl = (url: string, baseUrl: string) => {
	baseUrl = rtrimSlashes(baseUrl).trim(); // All the code below assumes that the baseUrl does not end up with a slash
	url = url.trim();

	if (!url) url = '';
	if (!baseUrl) return url;
	if (url.indexOf('#') === 0) return url; // Don't prepend if it's a local anchor
	if (urlProtocol(url)) return url; // Don't prepend the base URL if the URL already has a scheme

	if (url.length >= 2 && url.indexOf('//') === 0) {
		// If it starts with // it's a protcol-relative URL
		return urlProtocol(baseUrl) + url;
	} else if (url && url[0] === '/') {
		// If it starts with a slash, it's an absolute URL so it should be relative to the domain (and not to the full baseUrl)
		return urlWithoutPath(baseUrl) + url;
	} else {
		return baseUrl + (url ? `/${url}` : '');
	}
};


const resourceRegex = /^(joplin:\/\/|:\/)([0-9a-zA-Z]{32})(|#[^\s]*)(|\s".*?")$/;

export const isResourceUrl = (url: string) => {
	return !!url.match(resourceRegex);
};

export const parseResourceUrl = (url: string) => {
	if (!isResourceUrl(url)) return null;

	const match = url.match(resourceRegex);

	const itemId = match[2];
	let hash = match[3].trim();

	// In general we want the hash to be decoded so that non-alphabetical languages
	// appear as-is without being encoded with %.
	// Fixes https://github.com/laurent22/joplin/issues/1870
	if (hash) hash = urlDecode(hash.substr(1)); // Remove the first #

	return {
		itemId: itemId,
		hash: hash,
	};
};

export const fileUrlToResourceUrl = (fileUrl: string, resourceDir: string) => {
	let resourceDirUrl = toFileProtocolPath(resourceDir);
	if (!resourceDirUrl.endsWith('/')) {
		resourceDirUrl += '/';
	}

	if (fileUrl.startsWith(resourceDirUrl)) {
		let result = fileUrl.substring(resourceDirUrl.length);
		// Remove the timestamp parameter, keep the hash.
		result = result.replace(/\?t=\d+(#.*)?$/, '$1');
		// Remove the file extension.
		result = result.replace(/\.[a-z0-9]+(#.*)?$/, '$1');
		result = `joplin://${result}`;

		if (isResourceUrl(result)) {
			return result;
		}
	}

	return null;
};

export const extractResourceUrls = (text: string) => {
	const markdownLinksRE = /\]\((.*?)\)/g;
	const output = [];
	let result = null;

	while ((result = markdownLinksRE.exec(text)) !== null) {
		const resourceUrlInfo = parseResourceUrl(result[1]);
		if (resourceUrlInfo) output.push(resourceUrlInfo);
	}

	const htmlRegexes = [
		/<img[\s\S]*?src=["']:\/([a-zA-Z0-9]{32})["'][\s\S]*?>/gi,
		/<a[\s\S]*?href=["']:\/([a-zA-Z0-9]{32})["'][\s\S]*?>/gi,
	];

	for (const htmlRegex of htmlRegexes) {
		while (true) {
			const m = htmlRegex.exec(text);
			if (!m) break;
			output.push({ itemId: m[1], hash: '' });
		}
	}

	return output;
};

export const objectToQueryString = (query: Record<string, string>) => {
	if (!query) return '';

	let queryString = '';
	const s = [];
	for (const k in query) {
		if (!query.hasOwnProperty(k)) continue;
		s.push(`${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`);
	}
	queryString = s.join('&');

	return queryString;
};

