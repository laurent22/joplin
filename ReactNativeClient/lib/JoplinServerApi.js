const { Logger } = require('lib/logger.js');
const { shim } = require('lib/shim.js');
const JoplinError = require('lib/JoplinError');
const { rtrimSlashes } = require('lib/path-utils.js');
const base64 = require('base-64');

class JoplinServerApi {

	constructor(options) {
		this.logger_ = new Logger();
		this.options_ = options;
	}

	setLogger(l) {
		this.logger_ = l;
	}

	logger() {
		return this.logger_;
	}

	authToken() {
		if (!this.options_.username() || !this.options_.password()) return null;
		try {
			// Note: Non-ASCII passwords will throw an error about Latin1 characters - https://github.com/laurent22/joplin/issues/246
			// Tried various things like the below, but it didn't work on React Native:
			// return base64.encode(utf8.encode(this.options_.username() + ':' + this.options_.password()));
			return base64.encode(`${this.options_.username()}:${this.options_.password()}`);
		} catch (error) {
			error.message = `Cannot encode username/password: ${error.message}`;
			throw error;
		}
	}

	baseUrl() {
		return rtrimSlashes(this.options_.baseUrl());
	}

	requestToCurl_(url, options) {
		let output = [];
		output.push('curl');
		output.push('-v');
		if (options.method) output.push(`-X ${options.method}`);
		if (options.headers) {
			for (let n in options.headers) {
				if (!options.headers.hasOwnProperty(n)) continue;
				output.push(`${'-H ' + '"'}${n}: ${options.headers[n]}"`);
			}
		}
		if (options.body) output.push(`${'--data ' + '\''}${options.body}'`);
		output.push(url);

		return output.join(' ');
	}

	async exec(method, path = '', body = null, headers = null, options = null) {
		if (headers === null) headers = {};
		if (options === null) options = {};

		const authToken = this.authToken();

		if (authToken) headers['Authorization'] = `Basic ${authToken}`;

		headers['Content-Type'] = 'application/json';

		if (typeof body === 'object' && body !== null) body = JSON.stringify(body);

		const fetchOptions = {};
		fetchOptions.headers = headers;
		fetchOptions.method = method;
		if (options.path) fetchOptions.path = options.path;
		if (body) fetchOptions.body = body;

		const url = `${this.baseUrl()}/${path}`;

		let response = null;

		// console.info('WebDAV Call', method + ' ' + url, headers, options);
		console.info(this.requestToCurl_(url, fetchOptions));

		if (typeof body === 'string') fetchOptions.headers['Content-Length'] = `${shim.stringByteLength(body)}`;
		response = await shim.fetch(url, fetchOptions);

		const responseText = await response.text();

		let responseJson_ = null;
		const loadResponseJson = async () => {
			if (!responseText) return null;
			if (responseJson_) return responseJson_;
			return JSON.parse(responseText);
		};

		const newError = (message, code = 0) => {
			return new JoplinError(`${method} ${path}: ${message} (${code})`, code);
		};

		if (!response.ok) {
			let json = null;
			try {
				json = await loadResponseJson();
			} catch (error) {
				throw newError(`Unknown error: ${responseText.substr(0, 4096)}`, response.status);
			}

			const trace = json.stacktrace ? `\n${json.stacktrace}` : '';
			throw newError(json.error + trace, response.status);
		}

		const output = await loadResponseJson();
		return output;
	}
}

module.exports = JoplinServerApi;
