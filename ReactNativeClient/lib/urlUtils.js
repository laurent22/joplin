const { rtrimSlashes } = require('lib/path-utils');

const urlUtils = {};

urlUtils.hash = function(url) {
	const s = url.split('#');
	if (s.length <= 1) return '';
	return s[s.length - 1];
};

urlUtils.urlWithoutPath = function(url) {
	const parsed = require('url').parse(url, true);
	return parsed.protocol + '//' + parsed.host;
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
		return baseUrl + (url ? '/' + url : '');
	}
};

module.exports = urlUtils;
