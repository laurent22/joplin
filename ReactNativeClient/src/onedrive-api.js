const fetch = require('node-fetch');
import { stringify } from 'query-string';

class OneDriveApi {

	constructor(clientId, clientSecret) {
		this.clientId_ = clientId;
		this.clientSecret_ = clientSecret;
	}

	setToken(token) {
		this.token_ = token;
	}

	clientId() {
		return this.clientId_;
	}

	clientSecret() {
		return this.clientSecret_;
	}

	possibleOAuthFlowPorts() {
		return [1917, 9917, 8917];
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

	async exec(method, path, query = null, data = null, options = null) {
		method = method.toUpperCase();

		if (!options) options = {};
		if (!options.headers) options.headers = {};

		if (this.token_) {
			options.headers['Authorization'] = 'bearer ' + this.token_;
		}

		if (method != 'GET') {
			options.method = method;
		}

		if (method == 'PATCH') {
			options.headers['Content-Type'] = 'application/json';
			if (data) data = JSON.stringify(data);
		}

		let url = 'https://graph.microsoft.com/v1.0' + path;

		if (query) url += '?' + stringify(query);

		if (data) options.body = data;

		console.info(method + ' ' + url);
		console.info(data);

		let response = await fetch(url, options);
		if (!response.ok) {
			let error = await response.json();
			throw error;
		}

		return response;
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

}

export { OneDriveApi };