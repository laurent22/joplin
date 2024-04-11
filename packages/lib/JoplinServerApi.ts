import shim from './shim';
import { _ } from './locale';
const { rtrimSlashes } = require('./path-utils.js');
import JoplinError from './JoplinError';
import { Env } from './models/Setting';
import Logger from '@joplin/utils/Logger';
import personalizedUserContentBaseUrl from './services/joplinServer/personalizedUserContentBaseUrl';
import { getHttpStatusMessage } from './net-utils';
import { getApplicationInformation } from './services/joplinCloudUtils';
const { stringify } = require('query-string');

const logger = Logger.create('JoplinServerApi');

interface Options {
	baseUrl(): string;
	userContentBaseUrl(): string;
	username(): string;
	password(): string;
	env?: Env;
}

enum ExecOptionsResponseFormat {
	Json = 'json',
	Text = 'text',
}

enum ExecOptionsTarget {
	String = 'string',
	File = 'file',
}

export interface ExecOptions {
	responseFormat?: ExecOptionsResponseFormat;
	target?: ExecOptionsTarget;
	path?: string;
	source?: string;
}

interface Session {
	id: string;
	user_id: string;
}

export default class JoplinServerApi {

	private options_: Options;
	private session_: Session;
	private debugRequests_ = false;
	private debugRequestsShowPasswords_ = false;

	public constructor(options: Options) {
		this.options_ = options;

		if (options.env !== Env.Dev) {
			this.debugRequestsShowPasswords_ = false;
		}
	}

	public baseUrl() {
		return rtrimSlashes(this.options_.baseUrl());
	}

	public personalizedUserContentBaseUrl(userId: string) {
		return personalizedUserContentBaseUrl(userId, this.baseUrl(), this.options_.userContentBaseUrl());
	}

	private async getClientInfo() {
		const { platform, type } = await getApplicationInformation();
		const clientInfo = {
			platform,
			type,
			version: shim.appVersion(),
		};

		return clientInfo;
	}

	private async session() {
		if (this.session_) return this.session_;

		const clientInfo = await this.getClientInfo();

		if (!this.options_.username() || !this.options_.password()) {
			return null;
		}

		try {
			this.session_ = await this.exec_('POST', 'api/sessions', null, {
				email: this.options_.username(),
				password: this.options_.password(),
				...clientInfo,
			});

			return this.session_;
		} catch (error) {
			logger.error('Could not acquire session:', error.details, '\n', error);
			throw error;
		}
	}

	private async sessionId() {
		const session = await this.session();
		return session ? session.id : '';
	}

	public get userId(): string {
		return this.session_ ? this.session_.user_id : '';
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static connectionErrorMessage(error: any) {
		const msg = error && error.message ? error.message : 'Unknown error';
		return _('Could not connect to Joplin Server. Please check the Synchronisation options in the config screen. Full error was:\n\n%s', msg);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private hidePasswords(o: any): any {
		if (typeof o === 'string') {
			try {
				const output = JSON.parse(o);
				if (!output) return o;
				if (output.password && !this.debugRequestsShowPasswords_) output.password = '******';
				return JSON.stringify(output);
			} catch (error) {
				return o;
			}
		} else {
			const output = { ...o };
			if (output.password && !this.debugRequestsShowPasswords_) output.password = '******';
			if (output['X-API-AUTH'] && !this.debugRequestsShowPasswords_) output['X-API-AUTH'] = '******';
			return output;
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private requestToCurl_(url: string, options: any) {
		const output = [];
		output.push('curl');
		output.push('-v');
		if (options.method) output.push(`-X ${options.method}`);
		if (options.headers) {
			const headers = this.hidePasswords(options.headers);
			for (const n in options.headers) {
				if (!options.headers.hasOwnProperty(n)) continue;
				output.push(`${'-H ' + '"'}${n}: ${headers[n]}"`);
			}
		}
		if (options.body) {
			const serialized = typeof options.body !== 'string' ? JSON.stringify(this.hidePasswords(options.body)) : this.hidePasswords(options.body);
			output.push(`${'--data ' + '\''}${serialized}'`);
		}
		output.push(`'${url}'`);

		return output.join(' ');
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private async exec_(method: string, path = '', query: Record<string, any> = null, body: any = null, headers: any = null, options: ExecOptions = null) {
		if (headers === null) headers = {};
		if (options === null) options = {};
		if (!options.responseFormat) options.responseFormat = ExecOptionsResponseFormat.Json;
		if (!options.target) options.target = ExecOptionsTarget.String;

		let sessionId = '';
		if (path !== 'api/sessions' && !sessionId) {
			sessionId = await this.sessionId();
		}

		if (sessionId) headers['X-API-AUTH'] = sessionId;
		headers['X-API-MIN-VERSION'] = '2.6.0'; // Need server 2.6 for new lock support

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const fetchOptions: any = {};
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

		let url = `${this.baseUrl()}/${path}`;

		if (query) {
			url += url.indexOf('?') < 0 ? '?' : '&';
			url += stringify(query);
		}

		const startTime = Date.now();

		try {
			if (this.debugRequests_) {
				logger.debug(this.requestToCurl_(url, fetchOptions));
			}

			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			let response: any = null;

			if (options.source === 'file' && (method === 'POST' || method === 'PUT')) {
				if (fetchOptions.path) {
					const fileStat = await shim.fsDriver().stat(fetchOptions.path);
					if (fileStat) fetchOptions.headers['Content-Length'] = `${fileStat.size}`;
				}
				response = await shim.uploadBlob(url, fetchOptions);
			} else if (options.target === 'string') {
				if (typeof body === 'string') fetchOptions.headers['Content-Length'] = `${shim.stringByteLength(body)}`;
				response = await shim.fetch(url, fetchOptions);
			} else {
				// file
				response = await shim.fetchBlob(url, fetchOptions);
			}

			const responseText = await response.text();

			if (this.debugRequests_) {
				logger.debug('Response', Date.now() - startTime, options.responseFormat, responseText);
			}

			const shortResponseText = () => {
				return (`${responseText}`).substr(0, 1024);
			};

			// Creates an error object with as much data as possible as it will appear in the log, which will make debugging easier
			const newError = (message: string, code = 0) => {
				// Gives a shorter response for error messages. Useful for cases where a full HTML page is accidentally loaded instead of
				// JSON. That way the error message will still show there's a problem but without filling up the log or screen.
				// return new JoplinError(`${method} ${path}: ${message} (${code}): ${shortResponseText}`, code);
				return new JoplinError(message, code, `${method} ${path}: ${message} (${code}): ${shortResponseText()}`);
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			let responseJson_: any = null;
			const loadResponseJson = async () => {
				if (!responseText) return null;
				if (responseJson_) return responseJson_;
				responseJson_ = JSON.parse(responseText);
				if (!responseJson_) throw newError('Cannot parse JSON response', response.status);
				return responseJson_;
			};

			if (!response.ok) {
				if (options.target === 'file') throw newError(`Cannot transfer file: ${await response.text()}`, response.status);

				let json = null;
				try {
					json = await loadResponseJson();
				} catch (error) {
					// Just send back the plain text in newErro()
				}

				if (json && json.error) {
					throw newError(`${json.error}`, json.code ? json.code : response.status);
				}

				// "Unknown error" means it probably wasn't generated by the
				// application but for example by the Nginx or Apache reverse
				// proxy. So in that case we attach the response content to the
				// error message so that it shows up in logs. It might be for
				// example an error returned by the Nginx or Apache reverse
				// proxy. For example:
				//
				// <html>
				//     <head><title>413 Request Entity Too Large</title></head>
				//     <body>
				//         <center><h1>413 Request Entity Too Large</h1></center>
				//         <hr><center>nginx/1.18.0 (Ubuntu)</center>
				//     </body>
				// </html>
				throw newError(`Error ${response.status} ${getHttpStatusMessage(response.status)}: ${shortResponseText()}`, response.status);
			}

			if (options.responseFormat === 'text') return responseText;

			const output = await loadResponseJson();
			return output;
		} catch (error) {
			// Don't print error info for file not found (handled by the
			// driver), or lock-acquisition errors because it's handled by
			// LockHandler.
			if (![404, 'hasExclusiveLock', 'hasSyncLock'].includes(error.code)) {
				logger.warn(this.requestToCurl_(url, fetchOptions));
				logger.warn('Code:', error.code);
				logger.warn(error);
			}

			throw error;
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async exec(method: string, path = '', query: Record<string, any> = null, body: any = null, headers: any = null, options: ExecOptions = null) {
		for (let i = 0; i < 2; i++) {
			try {
				const response = await this.exec_(method, path, query, body, headers, options);
				return response;
			} catch (error) {
				if (error.code === 403 && i === 0) {
					logger.info('Session expired or invalid - trying to login again', error);
					this.session_ = null; // By setting it to null, the service will try to login again
				} else {
					throw error;
				}
			}
		}
	}

	public async loadSession() {
		await this.session();
	}
}
