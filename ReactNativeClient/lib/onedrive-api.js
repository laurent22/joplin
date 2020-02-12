const { shim } = require('lib/shim.js');
const { stringify } = require('query-string');
const { time } = require('lib/time-utils.js');
const { Logger } = require('lib/logger.js');
const { _ } = require('lib/locale.js');

class OneDriveApi {
	// `isPublic` is to tell OneDrive whether the application is a "public" one (Mobile and desktop
	// apps are considered "public"), in which case the secret should not be sent to the API.
	// In practice the React Native app is public, and the Node one is not because we
	// use a local server for the OAuth dance.
	constructor(clientId, clientSecret, isPublic) {
		this.clientId_ = clientId;
		this.clientSecret_ = clientSecret;
		this.auth_ = null;
		this.isPublic_ = isPublic;
		this.listeners_ = {
			authRefreshed: [],
		};
		this.logger_ = new Logger();
	}

	setLogger(l) {
		this.logger_ = l;
	}

	logger() {
		return this.logger_;
	}

	isPublic() {
		return this.isPublic_;
	}

	dispatch(eventName, param) {
		let ls = this.listeners_[eventName];
		for (let i = 0; i < ls.length; i++) {
			ls[i](param);
		}
	}

	on(eventName, callback) {
		this.listeners_[eventName].push(callback);
	}

	tokenBaseUrl() {
		return 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
	}

	nativeClientRedirectUrl() {
		return 'https://login.microsoftonline.com/common/oauth2/nativeclient';
	}

	auth() {
		return this.auth_;
	}

	setAuth(auth) {
		this.auth_ = auth;
		this.dispatch('authRefreshed', this.auth());
	}

	token() {
		return this.auth_ ? this.auth_.access_token : null;
	}

	clientId() {
		return this.clientId_;
	}

	clientSecret() {
		return this.clientSecret_;
	}

	async appDirectory() {
		let r = await this.execJson('GET', '/drive/special/approot');
		return `${r.parentReference.path}/${r.name}`;
	}

	authCodeUrl(redirectUri) {
		let query = {
			client_id: this.clientId_,
			scope: 'files.readwrite offline_access',
			response_type: 'code',
			redirect_uri: redirectUri,
		};
		return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${stringify(query)}`;
	}

	async execTokenRequest(code, redirectUri) {
		let body = new shim.FormData();
		body.append('client_id', this.clientId());
		if (!this.isPublic()) body.append('client_secret', this.clientSecret());
		body.append('code', code);
		body.append('redirect_uri', redirectUri);
		body.append('grant_type', 'authorization_code');

		const r = await shim.fetch(this.tokenBaseUrl(), {
			method: 'POST',
			body: body,
		});

		if (!r.ok) {
			const text = await r.text();
			throw new Error(`Could not retrieve auth code: ${r.status}: ${r.statusText}: ${text}`);
		}

		try {
			const json = await r.json();
			this.setAuth(json);
		} catch (error) {
			this.setAuth(null);
			const text = await r.text();
			error.message += `: ${text}`;
			throw error;
		}
	}

	oneDriveErrorResponseToError(errorResponse) {
		if (!errorResponse) return new Error('Undefined error');

		if (errorResponse.error) {
			let e = errorResponse.error;
			let output = new Error(e.message);
			if (e.code) output.code = e.code;
			if (e.innerError) output.innerError = e.innerError;
			return output;
		} else {
			return new Error(JSON.stringify(errorResponse));
		}
	}

	async exec(method, path, query = null, data = null, options = null) {
		if (!path) throw new Error('Path is required');

		method = method.toUpperCase();

		if (!options) options = {};
		if (!options.headers) options.headers = {};
		if (!options.target) options.target = 'string';

		if (method != 'GET') {
			options.method = method;
		}

		if (method == 'PATCH' || method == 'POST') {
			options.headers['Content-Type'] = 'application/json';
			if (data) data = JSON.stringify(data);
		}

		let url = path;

		// In general, `path` contains a path relative to the base URL, but in some
		// cases the full URL is provided (for example, when it's a URL that was
		// retrieved from the API).
		if (url.indexOf('https://') !== 0) url = `https://graph.microsoft.com/v1.0${path}`;

		if (query) {
			url += url.indexOf('?') < 0 ? '?' : '&';
			url += stringify(query);
		}

		if (data) options.body = data;

		options.timeout = 1000 * 60 * 5; // in ms

		for (let i = 0; i < 5; i++) {
			options.headers['Authorization'] = `bearer ${this.token()}`;

			let response = null;
			try {
				if (options.source == 'file' && (method == 'POST' || method == 'PUT')) {
					response = await shim.uploadBlob(url, options);
				} else if (options.target == 'string') {
					response = await shim.fetch(url, options);
				} else {
					// file
					response = await shim.fetchBlob(url, options);
				}
			} catch (error) {
				this.logger().error('Got unhandled error:', error ? error.code : '', error ? error.message : '', error);
				throw error;
			}

			if (!response.ok) {
				let errorResponseText = await response.text();
				let errorResponse = null;
				try {
					errorResponse = JSON.parse(errorResponseText); // await response.json();
				} catch (error) {
					error.message = `OneDriveApi::exec: Cannot parse JSON error: ${errorResponseText} ${error.message}`;
					throw error;
				}

				let error = this.oneDriveErrorResponseToError(errorResponse);

				if (error.code == 'InvalidAuthenticationToken' || error.code == 'unauthenticated') {
					this.logger().info('Token expired: refreshing...');
					await this.refreshAccessToken();
					continue;
				} else if (error && ((error.error && error.error.code == 'generalException') || error.code == 'generalException' || error.code == 'EAGAIN')) {
					// Rare error (one Google hit) - I guess the request can be repeated
					// { error:
					//    { code: 'generalException',
					//      message: 'An error occurred in the data store.',
					//      innerError:
					//       { 'request-id': 'b4310552-c18a-45b1-bde1-68e2c2345eef',
					//         date: '2017-06-29T00:15:50' } } }

					// { FetchError: request to https://graph.microsoft.com/v1.0/drive/root:/Apps/Joplin/.sync/7ee5dc04afcb414aa7c684bfc1edba8b.md_1499352102856 failed, reason: connect EAGAIN 65.52.64.250:443 - Local (0.0.0.0:54374)
					//   name: 'FetchError',
					//   message: 'request to https://graph.microsoft.com/v1.0/drive/root:/Apps/Joplin/.sync/7ee5dc04afcb414aa7c684bfc1edba8b.md_1499352102856 failed, reason: connect EAGAIN 65.52.64.250:443 - Local (0.0.0.0:54374)',
					//   type: 'system',
					//   errno: 'EAGAIN',
					//   code: 'EAGAIN' }
					this.logger().info(`Got error below - retrying (${i})...`);
					this.logger().info(error);
					await time.sleep((i + 1) * 3);
					continue;
				} else if (error && (error.code === 'resourceModified' || (error.error && error.error.code === 'resourceModified'))) {
					// NOTE: not tested, very hard to reproduce and non-informative error message, but can be repeated

					// Error: ETag does not match current item's value
					// Code: resourceModified
					// Header: {"_headers":{"cache-control":["private"],"transfer-encoding":["chunked"],"content-type":["application/json"],"request-id":["d...ea47"],"client-request-id":["d99...ea47"],"x-ms-ags-diagnostic":["{\"ServerInfo\":{\"DataCenter\":\"North Europe\",\"Slice\":\"SliceA\",\"Ring\":\"2\",\"ScaleUnit\":\"000\",\"Host\":\"AGSFE_IN_13\",\"ADSiteName\":\"DUB\"}}"],"duration":["96.9464"],"date":[],"connection":["close"]}}
					// Request: PATCH https://graph.microsoft.com/v1.0/drive/root:/Apps/JoplinDev/f56c5601fee94b8085524513bf3e352f.md null "{\"fileSystemInfo\":{\"lastModifiedDateTime\":\"....\"}}" {"headers":{"Content-Type":"application/json","Authorization":"bearer ...

					this.logger().info(`Got error below - retrying (${i})...`);
					this.logger().info(error);
					await time.sleep((i + 1) * 3);
					continue;
				} else if (error.code == 'itemNotFound' && method == 'DELETE') {
					// Deleting a non-existing item is ok - noop
					return;
				} else {
					error.request = `${method} ${url} ${JSON.stringify(query)} ${JSON.stringify(data)} ${JSON.stringify(options)}`;
					error.headers = await response.headers;
					throw error;
				}
			}

			return response;
		}

		throw new Error(`Could not execute request after multiple attempts: ${method} ${url}`);
	}

	async execJson(method, path, query, data) {
		let response = await this.exec(method, path, query, data);
		let errorResponseText = await response.text();
		try {
			let output = JSON.parse(errorResponseText); // await response.json();
			return output;
		} catch (error) {
			error.message = `OneDriveApi::execJson: Cannot parse JSON: ${errorResponseText} ${error.message}`;
			throw error;
			// throw new Error('Cannot parse JSON: ' + text);
		}
	}

	async execText(method, path, query, data) {
		let response = await this.exec(method, path, query, data);
		let output = await response.text();
		return output;
	}

	async refreshAccessToken() {
		if (!this.auth_ || !this.auth_.refresh_token) {
			this.setAuth(null);
			throw new Error(_('Cannot refresh token: authentication data is missing. Starting the synchronisation again may fix the problem.'));
		}

		let body = new shim.FormData();
		body.append('client_id', this.clientId());
		if (!this.isPublic()) body.append('client_secret', this.clientSecret());
		body.append('refresh_token', this.auth_.refresh_token);
		body.append('redirect_uri', 'http://localhost:1917');
		body.append('grant_type', 'refresh_token');

		let options = {
			method: 'POST',
			body: body,
		};

		let response = await shim.fetch(this.tokenBaseUrl(), options);
		if (!response.ok) {
			this.setAuth(null);
			let msg = await response.text();
			throw new Error(`${msg}: TOKEN: ${this.auth_}`);
		}

		let auth = await response.json();
		this.setAuth(auth);
	}
}

module.exports = { OneDriveApi };
