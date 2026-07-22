import shim from './shim';
import time from './time';
import Logger from '@joplin/utils/Logger';
import JoplinError from './JoplinError';

import { stringify } from 'query-string';
import { objectToQueryString } from './urlUtils';
import { Buffer } from 'buffer';

const logger = Logger.create('PCloudApi');

// pCloud has two data centres, each with its own API host. The host to use
// for an account is returned by the OAuth token exchange (locationid).
const PCloudApiHost = {
	US: 'api.pcloud.com',
	EU: 'eapi.pcloud.com',
};

export type PCloudAuth = {
	accessToken: string;
	hostname: string;
	locationid: number;
	uid: number;
};

export type PCloudMetadata = {
	name: string;
	path: string;
	isfolder: boolean;
	modified: string;
	size?: number;
	fileid?: number;
	folderid?: number;
	contents?: PCloudMetadata[];
};

type ListenerCallback = (param: unknown)=> void;

export default class PCloudApi {

	private clientId_: string;
	private clientSecret_: string;
	private auth_: PCloudAuth = null;
	private listeners_: Record<string, ListenerCallback[]>;

	public constructor(clientId: string, clientSecret: string) {
		this.clientId_ = clientId;
		this.clientSecret_ = clientSecret;
		this.auth_ = null;
		this.listeners_ = {
			authRefreshed: [],
		};
	}

	public dispatch(eventName: string, param: unknown) {
		const ls = this.listeners_[eventName];
		for (let i = 0; i < ls.length; i++) {
			ls[i](param);
		}
	}

	public on(eventName: string, callback: ListenerCallback) {
		this.listeners_[eventName].push(callback);
	}

	public auth(): PCloudAuth {
		return this.auth_;
	}

	public setAuth(auth: PCloudAuth) {
		this.auth_ = auth;
		this.dispatch('authRefreshed', this.auth());
	}

	public clientId() {
		return this.clientId_;
	}

	public clientSecret() {
		return this.clientSecret_;
	}

	// All API calls go to the API host of the data centre the account is on
	private apiHost() {
		return this.auth_ && this.auth_.hostname ? this.auth_.hostname : PCloudApiHost.US;
	}

	// Without a redirect_uri, pCloud simply displays the authorisation code to
	// the user, who can then copy/paste it into the application (same flow as
	// the Dropbox synchronisation target).
	public loginUrl() {
		const query = {
			client_id: this.clientId_,
			response_type: 'code',
		};
		return `https://my.pcloud.com/oauth2/authorize?${stringify(query)}`;
	}

	public async execTokenRequest(code: string) {
		// An authorisation code is only valid on the API host of the data centre
		// that issued it, but the account's data centre is only known after the
		// exchange (from locationid). So try the US host first and, if the code
		// is rejected, retry on the EU host.
		let json = null;
		try {
			json = await this.execTokenRequestOnHost(PCloudApiHost.US, code);
		} catch (error) {
			try {
				json = await this.execTokenRequestOnHost(PCloudApiHost.EU, code);
			} catch (retryError) {
				this.setAuth(null);
				throw retryError;
			}
		}

		// The data centre the account is on (locationid) determines which API
		// host to use for all subsequent calls. pCloud tokens do not expire,
		// so there is no refresh token flow.
		this.setAuth({
			accessToken: json.access_token,
			hostname: json.locationid === 2 ? PCloudApiHost.EU : PCloudApiHost.US,
			locationid: json.locationid,
			uid: json.uid,
		});
	}

	private async execTokenRequestOnHost(host: string, code: string) {
		const body: Record<string, string> = {};
		body['client_id'] = this.clientId();
		body['client_secret'] = this.clientSecret();
		body['code'] = code;

		const r = await shim.fetch(`https://${host}/oauth2_token`, {
			method: 'POST',
			body: objectToQueryString(body),
			headers: {
				['Content-Type']: 'application/x-www-form-urlencoded',
			},
		});

		const responseText = await r.text();

		if (!r.ok) {
			throw new Error(`Could not retrieve auth token: ${r.status}: ${r.statusText}: ${responseText}`);
		}

		let json = null;
		try {
			json = JSON.parse(responseText);
		} catch (error) {
			error.message += `: ${responseText}`;
			throw error;
		}

		if (json.result !== 0) {
			throw new Error(`Could not retrieve auth token: ${json.result}: ${json.error ? json.error : responseText}`);
		}

		return json;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- query is route-specific URL params; data is the request body (string); options is the FetchOptions bag
	public async exec(method: string, path: string, query: any = null, data: any = null, options: any = null) {
		if (!path) throw new Error('Path is required');

		method = method.toUpperCase();

		if (!options) options = {};
		if (!options.headers) options.headers = {};
		if (!options.target) options.target = 'string';
		options.method = method;

		// The access token is sent in the Authorization header rather than in
		// the URL query string, so that it cannot leak into log files or into
		// error messages that contain the request URL.
		if (this.auth_) options.headers['Authorization'] = `Bearer ${this.auth_.accessToken}`;

		query = { ...query };

		let url = path;

		if (url.indexOf('https://') !== 0) {
			url = `https://${this.apiHost()}/${path}`;
		}

		if (query && Object.keys(query).length) {
			url += url.indexOf('?') < 0 ? '?' : '&';
			url += stringify(query);
		}

		if (data) options.body = data;

		options.timeout = 1000 * 60 * 5; // in ms

		for (let i = 0; i < 5; i++) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- error here is a network/HTTP error with platform-specific fields (code, message) accessed by later blocks
			const handleRequestRepeat = async (error: any, sleepSeconds: number = null) => {
				sleepSeconds ??= (i + 1) * 5;
				logger.info(`Got error below - retrying (${i})...`);
				logger.info(error);
				await time.sleep(sleepSeconds);
			};

			let response = null;
			try {
				if (options.target === 'string') {
					response = await shim.fetch(url, options);
				} else {
					// file
					response = await shim.fetchBlob(url, options);
				}
			} catch (error) {
				if (shim.fetchRequestCanBeRetried(error)) {
					await handleRequestRepeat(error);
					continue;
				} else {
					logger.error('Got unhandled error:', error ? error.code : '', error ? error.message : '', error);
					throw error;
				}
			}

			if (!response.ok) {
				// pCloud returns an HTTP error status along with a JSON body in
				// the form { result: <code>, error: "<message>" }
				const errorResponseText = await response.text();

				let resultCode = response.status;
				let errorMessage = errorResponseText;
				try {
					const errorJson = JSON.parse(errorResponseText);
					if (typeof errorJson.result === 'number') resultCode = errorJson.result;
					if (errorJson.error) errorMessage = errorJson.error;
				} catch {
					// Not a JSON response - keep the HTTP status as error code
				}

				if (resultCode === 4000) {
					// "Too many login tries" - pCloud rate limiting, so wait and
					// repeat the request
					await handleRequestRepeat(new JoplinError(errorMessage, resultCode), 30);
					continue;
				}

				if (resultCode === 1000 || resultCode === 2000) {
					// "Log in required" or "Log in failed" - the token is no
					// longer valid so the user needs to log in again
					this.setAuth(null);
				}

				throw new JoplinError(`${method} ${path}: ${errorMessage} (${resultCode})`, resultCode);
			}

			return response;
		}

		// Use the API method path rather than the full URL, so that no
		// credential is ever included in the error message
		throw new Error(`Could not execute request after multiple attempts: ${method} ${path}`);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- See exec above
	public async execJson(method: string, path: string, query: any = null, data: any = null, options: any = null) {
		const response = await this.exec(method, path, query, data, options);
		const responseText = await response.text();

		let json = null;
		try {
			json = JSON.parse(responseText);
		} catch (error) {
			error.message = `PCloudApi::execJson: Cannot parse JSON: ${responseText} ${error.message}`;
			throw error;
		}

		// pCloud signals errors with a non-zero "result" field in the response
		if (json.result !== 0) {
			if (json.result === 1000 || json.result === 2000) this.setAuth(null);
			throw new JoplinError(`${method} ${path}: ${json.error ? json.error : responseText} (${json.result})`, json.result);
		}

		return json;
	}

	public async stat(path: string): Promise<PCloudMetadata> {
		const json = await this.execJson('GET', 'stat', { path: path });
		return json.metadata;
	}

	public async listFolder(path: string): Promise<PCloudMetadata> {
		const json = await this.execJson('GET', 'listfolder', { path: path });
		return json.metadata;
	}

	public async createFolderIfNotExists(path: string): Promise<PCloudMetadata> {
		const json = await this.execJson('GET', 'createfolderifnotexists', { path: path });
		return json.metadata;
	}

	public async deleteFile(path: string) {
		await this.execJson('GET', 'deletefile', { path: path });
	}

	public async deleteFolderRecursive(path: string) {
		await this.execJson('GET', 'deletefolderrecursive', { path: path });
	}

	// getfilelink returns a temporary link from which the file content can be
	// downloaded without authentication - this is how files are downloaded
	// from pCloud (their "downloadfile" end point is for something else - it
	// transfers a file from a URL to pCloud).
	public async fileLink(path: string): Promise<string> {
		const json = await this.execJson('GET', 'getfilelink', { path: path });
		if (!json.hosts || !json.hosts.length) throw new Error(`Could not get download link for: ${path}`);
		return `https://${json.hosts[0]}${json.path}`;
	}

	public async userInfo() {
		return this.execJson('GET', 'userinfo');
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- content is a string or Buffer; options is the FetchOptions bag with optional source/path fields
	public async uploadFile(parentDir: string, name: string, content: any, options: any = null): Promise<PCloudMetadata> {
		if (!options) options = {};

		let fileContent: Buffer = null;
		if (options.source === 'file') {
			const base64 = await shim.readLocalFileBase64(options.path);
			fileContent = Buffer.from(base64, 'base64');
		} else {
			fileContent = Buffer.from(content ? content : '', 'utf-8');
		}

		// The uploadfile end point expects multipart/form-data. The body is
		// built manually (rather than with FormData or the form-data package)
		// so that it works the same on all platforms (Node and React Native
		// both support sending a Buffer as request body).
		//
		// Note: pCloud also has a chunked upload API
		// (upload_create/upload_write/upload_save), which would allow
		// streaming large files without loading them in memory, however it is
		// only available in their binary protocol - uploadfile is the only
		// HTTP/JSON upload end point.
		const boundary = `------JoplinPCloud${Math.round(Math.random() * 1000000000)}`;
		const disposition = `Content-Disposition: form-data; name="file"; filename="${name.replace(/["\r\n]/g, '')}"`;

		const body = Buffer.concat([
			Buffer.from(`--${boundary}\r\n${disposition}\r\nContent-Type: application/octet-stream\r\n\r\n`, 'utf-8'),
			fileContent,
			Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8'),
		]);

		const fetchOptions = {
			target: 'string',
			headers: {
				'Content-Type': `multipart/form-data; boundary=${boundary}`,
				'Content-Length': `${body.length}`,
			},
		};

		// uploadfile overwrites an existing file with the same name
		const json = await this.execJson('POST', 'uploadfile', { path: parentDir, filename: name }, body, fetchOptions);
		return json.metadata && json.metadata.length ? json.metadata[0] : null;
	}

	public async downloadToString(path: string): Promise<string> {
		const url = await this.fileLink(path);
		const response = await shim.fetch(url, { method: 'GET' });
		if (!response.ok) {
			const text = await response.text();
			throw new Error(`Could not download file ${path}: ${response.status}: ${text}`);
		}
		return response.text();
	}

	public async downloadToFile(path: string, localPath: string) {
		const url = await this.fileLink(path);
		const response = await shim.fetchBlob(url, { method: 'GET', path: localPath });
		if (!response.ok) {
			throw new Error(`Could not download file ${path} to ${localPath}: ${response.status}`);
		}
		return response;
	}
}
