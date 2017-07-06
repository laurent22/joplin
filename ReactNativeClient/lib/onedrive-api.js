import { shim } from 'lib/shim.js';
import { stringify } from 'query-string';

class OneDriveApi {

	constructor(clientId, clientSecret) {
		this.clientId_ = clientId;
		this.clientSecret_ = clientSecret;
		this.auth_ = null;
		this.listeners_ = {
			'authRefreshed': [],
		};
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

	auth() {
		return this.auth_;
	}

	setAuth(auth) {
		this.auth_ = auth;
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
		return r.parentReference.path + '/' + r.name;
	}

	authCodeUrl(redirectUri) {
		let query = {
			client_id: this.clientId_,
			scope: 'files.readwrite offline_access',
			response_type: 'code',
			redirect_uri: redirectUri,
		};
		return 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?' + stringify(query);
	}

	async execTokenRequest(code, redirectUri, isPublic = false) {
		let body = new shim.FormData();
		body.append('client_id', this.clientId());
		if (!isPublic) body.append('client_secret', this.clientSecret());
		body.append('code', code);
		body.append('redirect_uri', redirectUri);
		body.append('grant_type', 'authorization_code');

		const r = await shim.fetch(this.tokenBaseUrl(), {
			method: 'POST',
			body: body,
		})

		if (!r.ok) {
			const text = await r.text();
			throw new Error('Could not retrieve auth code: ' + r.status + ': ' + r.statusText + ': ' + text);
		}

		try {
			const json = await r.json();
			this.setAuth(json);
		} catch (error) {
			const text = await r.text();
			error.message += ': ' + text;
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
		method = method.toUpperCase();

		if (!options) options = {};
		if (!options.headers) options.headers = {};

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
		if (url.indexOf('https://') !== 0) url = 'https://graph.microsoft.com/v1.0' + path;

		if (query) {
			url += url.indexOf('?') < 0 ? '?' : '&';
			url += stringify(query);
		}

		if (data) options.body = data;

		// Rare error (one Google hit) - maybe repeat the request when it happens?

		// { error:
		//    { code: 'generalException',
		//      message: 'An error occurred in the data store.',
		//      innerError:
		//       { 'request-id': 'b4310552-c18a-45b1-bde1-68e2c2345eef',
		//         date: '2017-06-29T00:15:50' } } }

		for (let i = 0; i < 5; i++) {
			options.headers['Authorization'] = 'bearer ' + this.token();

			let response = await shim.fetch(url, options);
			if (!response.ok) {
				let errorResponse = await response.json();
				let error = this.oneDriveErrorResponseToError(errorResponse);

				if (error.code == 'InvalidAuthenticationToken') {
					await this.refreshAccessToken();
					continue;
				} else {
					error.request = method + ' ' + url + ' ' + JSON.stringify(query) + ' ' + JSON.stringify(data) + ' ' + JSON.stringify(options);
					throw error;
				}
			}

			return response;
		}

		throw new Error('Could not execute request after multiple attempts: ' + method + ' ' + url);
	}

	async execJson(method, path, query, data) {
		let response = await this.exec(method, path, query, data);
		let output = await response.json();
		return output;
	}

	async execText(method, path, query, data) {
		let response = await this.exec(method, path, query, data);
		let output = await response.text();
		return output;
	}

	async refreshAccessToken() {
		if (!this.auth_) throw new Error('Cannot refresh token: authentication data is missing');

		let body = new shim.FormData();
		body.append('client_id', this.clientId());
		body.append('client_secret', this.clientSecret());
		body.append('refresh_token', this.auth_.refresh_token);
		body.append('redirect_uri', 'http://localhost:1917');
		body.append('grant_type', 'refresh_token');

		let options = {
			method: 'POST',
			body: body,
		};

		this.auth_ = null;

		let response = await shim.fetch(this.tokenBaseUrl(), options);
		if (!response.ok) {
			let msg = await response.text();
			throw new Error(msg);
		}

		this.auth_ = await response.json();

		this.dispatch('authRefreshed', this.auth_);
	}

}

export { OneDriveApi };