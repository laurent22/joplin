const { Logger } = require('lib/logger.js');
const { shim } = require('lib/shim.js');
const JoplinError = require('lib/JoplinError');
const { rtrimSlashes } = require('lib/path-utils.js');
const base64 = require('base-64');
const { _ } = require('lib/locale');

interface JoplinServerApiOptions {
	username: Function,
	password: Function,
	baseUrl: Function,
}

export default class JoplinServerApi {

	logger_:any;
	options_:JoplinServerApiOptions;
	kvStore_:any;

	constructor(options:JoplinServerApiOptions) {
		this.logger_ = new Logger();
		this.options_ = options;
		this.kvStore_ = null;
	}

	setLogger(l:any) {
		this.logger_ = l;
	}

	logger():any {
		return this.logger_;
	}

	setKvStore(v:any) {
		this.kvStore_ = v;
	}

	kvStore() {
		if (!this.kvStore_) throw new Error('JoplinServerApi.kvStore_ is not set!!');
		return this.kvStore_;
	}

	authToken():string {
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

	baseUrl():string {
		return rtrimSlashes(this.options_.baseUrl());
	}

	static baseUrlFromNextcloudWebDavUrl(webDavUrl:string) {
		// http://nextcloud.local/remote.php/webdav/Joplin
		// http://nextcloud.local/index.php/apps/joplin/api
		const splitted = webDavUrl.split('/remote.php/webdav');
		if (splitted.length !== 2) throw new Error(`Unsupported WebDAV URL format: ${webDavUrl}`);
		return `${splitted[0]}/index.php/apps/joplin/api`;
	}

	syncTargetId(settings:any) {
		const s = settings['sync.5.syncTargets'][settings['sync.5.path']];
		if (!s) throw new Error(`Joplin Nextcloud app not configured for URL: ${this.baseUrl()}`);
		return s.uuid;
	}

	static connectionErrorMessage(error:any) {
		const msg = error && error.message ? error.message : 'Unknown error';
		return _('Could not connect to the Joplin Nextcloud app. Please check the configuration in the Synchronisation config screen. Full error was:\n\n%s', msg);
	}

	async setupSyncTarget(webDavUrl:string) {
		return this.exec('POST', 'sync_targets', {
			webDavUrl: webDavUrl,
		});
	}

	requestToCurl_(url:string, options:any) {
		const output = [];
		output.push('curl');
		output.push('-v');
		if (options.method) output.push(`-X ${options.method}`);
		if (options.headers) {
			for (const n in options.headers) {
				if (!options.headers.hasOwnProperty(n)) continue;
				output.push(`${'-H ' + '"'}${n}: ${options.headers[n]}"`);
			}
		}
		if (options.body) output.push(`${'--data ' + '\''}${options.body}'`);
		output.push(url);

		return output.join(' ');
	}

	async exec(method:string, path:string = '', body:any = null, headers:any = null, options:any = null):Promise<any> {
		if (headers === null) headers = {};
		if (options === null) options = {};

		const authToken = this.authToken();

		if (authToken) headers['Authorization'] = `Basic ${authToken}`;

		headers['Content-Type'] = 'application/json';

		if (typeof body === 'object' && body !== null) body = JSON.stringify(body);

		const fetchOptions:any = {};
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

		const responseJson_:any = null;
		const loadResponseJson = async () => {
			if (!responseText) return null;
			if (responseJson_) return responseJson_;
			try {
				return JSON.parse(responseText);
			} catch (error) {
				throw new Error(`Cannot parse JSON: ${responseText.substr(0, 8192)}`);
			}
		};

		const newError = (message:string, code:number = 0) => {
			return new JoplinError(`${method} ${path}: ${message} (${code})`, code);
		};

		if (!response.ok) {
			let json = null;
			try {
				json = await loadResponseJson();
			} catch (error) {
				throw newError(`Unknown error: ${responseText.substr(0, 8192)}`, response.status);
			}

			const trace = json.stacktrace ? `\n${json.stacktrace}` : '';
			let message = json.error;
			if (!message) message = responseText.substr(0, 8192);
			throw newError(message + trace, response.status);
		}

		const output = await loadResponseJson();
		return output;
	}
}
