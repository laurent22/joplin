const { Logger } = require('lib/logger.js');
const { shim } = require('lib/shim.js');
const JoplinError = require('lib/JoplinError');
const URL = require('url-parse');
const { time } = require('lib/time-utils');

class DropboxApi {

	constructor(options) {
		this.logger_ = new Logger();
		this.options_ = options;
		this.authToken_ = null;
	}

	setLogger(l) {
		this.logger_ = l;
	}

	logger() {
		return this.logger_;
	}

	authToken() {
		return this.authToken_; // Must be "Bearer XXXXXXXXXXXXXXXXXX"
	}

	setAuthToken(v) {
		this.authToken_ = v;
	}

	baseUrl(endPointFormat) {
		if (['content', 'api'].indexOf(endPointFormat) < 0) throw new Error('Invalid end point format: ' + endPointFormat);
		return 'https://' + endPointFormat + '.dropboxapi.com/2';
	}

	requestToCurl_(url, options) {
		let output = [];
		output.push('curl');
		if (options.method) output.push('-X ' + options.method);
		if (options.headers) {
			for (let n in options.headers) {
				if (!options.headers.hasOwnProperty(n)) continue;
				output.push('-H ' + "'" + n + ': ' + options.headers[n] + "'");
			}
		}
		if (options.body) output.push('--data ' + '"' + options.body + '"');
		output.push(url);

		return output.join(' ');		
	}

	async exec(method, path = '', body = null, headers = null, options = null) {
		if (headers === null) headers = {};
		if (options === null) options = {};
		if (!options.target) options.target = 'string';

		const authToken = this.authToken();

		if (authToken) headers['Authorization'] = authToken;

		const endPointFormat = ['files/upload', 'files/download'].indexOf(path) >= 0 ? 'content' : 'api';

		if (endPointFormat === 'api') {
			headers['Content-Type'] = 'application/json';
			if (body && typeof body === 'object') body = JSON.stringify(body);
		} else {
			headers['Content-Type'] = 'application/octet-stream';
		}

		const fetchOptions = {};
		fetchOptions.headers = headers;
		fetchOptions.method = method;
		if (options.path) fetchOptions.path = options.path;
		if (body) fetchOptions.body = body;

		const url = this.baseUrl(endPointFormat) + '/' + path;

		let tryCount = 0;

		while (true) {
			try {
				let response = null;

				// console.info(this.requestToCurl_(url, fetchOptions));

				const now = Date.now();
				// console.info(now + ': ' + method + ' ' + url);

				if (options.source == 'file' && (method == 'POST' || method == 'PUT')) {
					response = await shim.uploadBlob(url, fetchOptions);
				} else if (options.target == 'string') {
					response = await shim.fetch(url, fetchOptions);
				} else { // file
					response = await shim.fetchBlob(url, fetchOptions);
				}

				const responseText = await response.text();

				// console.info(now + ': Response: ' + responseText); 

				let responseJson_ = null;
				const loadResponseJson = () => {
					if (!responseText) return null;
					if (responseJson_) return responseJson_;
					try {
						responseJson_ = JSON.parse(responseText);
					} catch (error) {
						return { error: responseText };
					}
					return responseJson_;
				}

				// Creates an error object with as much data as possible as it will appear in the log, which will make debugging easier
				const newError = (message) => {
					const json = loadResponseJson();
					let code = '';
					if (json && json.error_summary) {
						code = json.error_summary;
					}

					// Gives a shorter response for error messages. Useful for cases where a full HTML page is accidentally loaded instead of
					// JSON. That way the error message will still show there's a problem but without filling up the log or screen.
					const shortResponseText = (responseText + '').substr(0, 1024);
					return new JoplinError(method + ' ' + path + ': ' + message + ' (' + response.status + '): ' + shortResponseText, code);
				}

				if (!response.ok) {
					// When using fetchBlob we only get a string (not xml or json) back
					if (options.target === 'file') throw newError('fetchBlob error');

					throw newError('Error');
				}

				if (options.responseFormat === 'text') return responseText;

				return loadResponseJson();
			} catch (error) {
				tryCount++;
				if (error.code.indexOf('too_many_write_operations') >= 0) {
					this.logger().warn('too_many_write_operations ' + tryCount);
					if (tryCount >= 3) {
						throw error;
					}
					await time.sleep(tryCount * 2);
				} else {
					throw error;
				}
			}
		}
	}

}

module.exports = DropboxApi;