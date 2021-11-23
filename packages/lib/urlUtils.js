const { rtrimSlashes } = require('./path-utils');
const { urlDecode } = require('./string-utils');

const urlUtils = {};

urlUtils.hash = function(url) {
	const s = url.split('#');
	if (s.length <= 1) return '';
	return s[s.length - 1];
};

urlUtils.urlWithoutPath = function(url) {
	const parsed = require('url').parse(url, true);
	return `${parsed.protocol}//${parsed.host}`;
};

urlUtils.urlProtocol = function(url) {
	if (!url) return '';
	const parsed = require('url').parse(url, true);
	return parsed.protocol;
};

urlUtils.prependBaseUrl = function(url, baseUrl) {
	baseUrl = rtrimSlashes(baseUrl).trim(); // All the code below assumes that the baseUrl does not end up with a slash
	url = url.trim();

	if (!url) url = '';
	if (!baseUrl) return url;
	if (url.indexOf('#') === 0) return url; // Don't prepend if it's a local anchor
	if (urlUtils.urlProtocol(url)) return url; // Don't prepend the base URL if the URL already has a scheme

	if (url.length >= 2 && url.indexOf('//') === 0) {
		// If it starts with // it's a protcol-relative URL
		return urlUtils.urlProtocol(baseUrl) + url;
	} else if (url && url[0] === '/') {
		// If it starts with a slash, it's an absolute URL so it should be relative to the domain (and not to the full baseUrl)
		return urlUtils.urlWithoutPath(baseUrl) + url;
	} else {
		return baseUrl + (url ? `/${url}` : '');
	}
};

const resourceRegex = /^(joplin:\/\/|:\/)([0-9a-zA-Z]{32})(|#[^\s]*)(|\s".*?")$/;

urlUtils.isResourceUrl = function(url) {
	return !!url.match(resourceRegex);
};

urlUtils.parseResourceUrl = function(url) {
	if (!urlUtils.isResourceUrl(url)) return null;

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

urlUtils.extractResourceUrls = function(text) {
	const markdownLinksRE = /\]\((.*?)\)/g;
	const output = [];
	let result = null;

	while ((result = markdownLinksRE.exec(text)) !== null) {
		const resourceUrlInfo = urlUtils.parseResourceUrl(result[1]);
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

urlUtils.objectToQueryString = function(query) {
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

// This is a modified version of the file-uri-to-path package:
//
// - It removes the dependency to the "path" package, which wouldn't work with
//   React Native.
//
// - It always returns paths with forward slashes "/". This is normally handled
//   properly everywhere.
//
// - Adds the "platform" parameter to optionall return paths with "\" for win32
function fileUriToPath_(uri, platform) {
	const sep = '/';

	if (
		typeof uri !== 'string' ||
		uri.length <= 7 ||
		uri.substring(0, 7) !== 'file://'
	) {
		throw new TypeError(
			'must pass in a file:// URI to convert to a file path'
		);
	}

	const rest = decodeURI(uri.substring(7));
	const firstSlash = rest.indexOf('/');
	let host = rest.substring(0, firstSlash);
	let path = rest.substring(firstSlash + 1);

	// 2.  Scheme Definition
	// As a special case, <host> can be the string "localhost" or the empty
	// string; this is interpreted as "the machine from which the URL is
	// being interpreted".
	if (host === 'localhost') {
		host = '';
	}

	if (host) {
		host = sep + sep + host;
	}

	// 3.2  Drives, drive letters, mount points, file system root
	// Drive letters are mapped into the top of a file URI in various ways,
	// depending on the implementation; some applications substitute
	// vertical bar ("|") for the colon after the drive letter, yielding
	// "file:///c|/tmp/test.txt".  In some cases, the colon is left
	// unchanged, as in "file:///c:/tmp/test.txt".  In other cases, the
	// colon is simply omitted, as in "file:///c/tmp/test.txt".
	path = path.replace(/^(.+)\|/, '$1:');

	// for Windows, we need to invert the path separators from what a URI uses
	// if (sep === '\\') {
	// 	path = path.replace(/\//g, '\\');
	// }

	if (/^.+:/.test(path)) {
		// has Windows drive at beginning of path
	} else {
		// unix path…
		path = sep + path;
	}

	if (platform === 'win32') {
		return (host + path).replace(/\//g, '\\');
	} else {
		return host + path;
	}
}

urlUtils.fileUriToPath = (path, platform = 'linux') => {
	const output = fileUriToPath_(path, platform);

	// The file-uri-to-path module converts Windows path such as
	//
	// file://c:/autoexec.bat => \\c:\autoexec.bat
	//
	// Probably because a file:// that starts with only two slashes is not
	// quite valid. If we use three slashes, it works:
	//
	// file:///c:/autoexec.bat => c:\autoexec.bat
	//
	// However there are various places in the app where we can find
	// paths with only two slashes because paths are often constructed
	// as `file://${resourcePath}` - which works in all OSes except
	// Windows.
	//
	// So here we introduce a special case - if we detect that we have
	// an invalid Windows path that starts with \\x:, we just remove
	// the first two backslashes.
	//
	// https://github.com/laurent22/joplin/issues/5693

	if (output.match(/^\/\/[a-zA-Z]:/)) {
		return output.substr(2);
	}

	return output;
};

module.exports = urlUtils;
