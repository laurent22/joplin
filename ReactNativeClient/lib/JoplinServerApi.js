const { Logger } = require('lib/logger.js');
const { rtrimSlashes } = require('lib/path-utils.js');
const { shim } = require('lib/shim');
const JoplinError = require('lib/JoplinError');

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

	baseUrl() {
		return rtrimSlashes(this.options_.baseUrl());
	}

	async session() {
		// TODO: handle invalid session
		if (this.session_) return this.session_;

		this.session_ = await this.exec('POST', 'api/sessions', {
			email: this.options_.email(),
			password: this.options_.password(),
		});

		return this.session_;
	}

	async sessionId() {
		const session = await this.session();
		return session ? session.id : '';
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
		if (options.body) output.push(`${'--data ' + '\''}${JSON.stringify(options.body)}'`);
		output.push(url);

		return output.join(' ');
	}

	async exec(method, path = '', body = null, headers = null, options = null) {
		if (headers === null) headers = {};
		if (options === null) options = {};
		if (!options.responseFormat) options.responseFormat = 'json';
		if (!options.target) options.target = 'string';

		let sessionId = '';
		if (path !== 'api/sessions' && !sessionId) {
			sessionId = await this.sessionId();
		}

		if (sessionId) headers['X-API-AUTH'] = sessionId;

		const fetchOptions = {};
		fetchOptions.headers = headers;
		fetchOptions.method = method;
		if (options.path) fetchOptions.path = options.path;

		if (body) {
			if (typeof body === 'object') {
				fetchOptions.body = JSON.stringify(body);
				fetchOptions.headers['Content-Type'] = 'application/json';
			} else {
				fetchOptions.body = body;
			}

			fetchOptions.headers['Content-Length'] = `${shim.stringByteLength(fetchOptions.body)}`;
		}

		const url = `${this.baseUrl()}/${path}`;

		let response = null;

		// console.info('Joplin API Call', `${method} ${url}`, headers, options);
		// console.info(this.requestToCurl_(url, fetchOptions));

		if (options.source == 'file' && (method == 'POST' || method == 'PUT')) {
			if (fetchOptions.path) {
				const fileStat = await shim.fsDriver().stat(fetchOptions.path);
				if (fileStat) fetchOptions.headers['Content-Length'] = `${fileStat.size}`;
			}
			response = await shim.uploadBlob(url, fetchOptions);
		} else if (options.target == 'string') {
			if (typeof body === 'string') fetchOptions.headers['Content-Length'] = `${shim.stringByteLength(body)}`;
			response = await shim.fetch(url, fetchOptions);
		} else {
			// file
			response = await shim.fetchBlob(url, fetchOptions);
		}

		const responseText = await response.text();

		// console.info('Joplin API Response', responseText);

		// Creates an error object with as much data as possible as it will appear in the log, which will make debugging easier
		const newError = (message, code = 0) => {
			// Gives a shorter response for error messages. Useful for cases where a full HTML page is accidentally loaded instead of
			// JSON. That way the error message will still show there's a problem but without filling up the log or screen.
			const shortResponseText = (`${responseText}`).substr(0, 1024);
			return new JoplinError(`${method} ${path}: ${message} (${code}): ${shortResponseText}`, code);
		};

		let responseJson_ = null;
		const loadResponseJson = async () => {
			if (!responseText) return null;
			if (responseJson_) return responseJson_;
			responseJson_ = JSON.parse(responseText);
			if (!responseJson_) throw newError('Cannot parse JSON response', response.status);
			return responseJson_;
		};

		if (!response.ok) {
			if (options.target === 'file') throw newError('fetchBlob error', response.status);

			let json = null;
			try {
				json = await loadResponseJson();
			} catch (error) {
				// Just send back the plain text in newErro()
			}

			if (json && json.message) {
				throw newError(`${json.message}`, response.status);
			}

			throw newError('Unknown error', response.status);
		}

		if (options.responseFormat === 'text') return responseText;

		const output = await loadResponseJson();
		return output;
	}
}

module.exports = JoplinServerApi;
