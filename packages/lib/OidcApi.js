const shim = require('./shim').default;
const { Digest } = require('./services/e2ee/types');

const { Buffer } = require('buffer');
const { stringify } = require('query-string');
const urlUtils = require('./urlUtils.js');

class OidcApi {
	constructor(options) {
		this.options_ = options;
		this.auth_ = null;
		this.discovery_ = null;
		this.pendingAuth_ = null;
		this.listeners_ = {
			authRefreshed: [],
		};
	}

	on(eventName, callback) {
		this.listeners_[eventName].push(callback);
	}

	dispatch_(eventName, auth) {
		const listeners = this.listeners_[eventName] || [];
		for (const listener of listeners) {
			listener(auth);
		}
	}

	auth() {
		return this.auth_;
	}

	setAuth(auth) {
		this.auth_ = this.normaliseAuth_(auth);
		this.dispatch_('authRefreshed', this.auth());
	}

	async authCodeUrl(redirectUri) {
		const discovery = await this.discovery();
		const state = await this.randomBase64Url_(24);
		const codeVerifier = await this.randomBase64Url_(64);
		const codeChallenge = await this.codeChallenge_(codeVerifier);

		this.pendingAuth_ = {
			redirectUri,
			state,
			codeVerifier,
		};

		const query = {
			client_id: this.options_.clientId,
			scope: this.options_.scope || 'openid profile email offline_access',
			response_type: 'code',
			redirect_uri: redirectUri,
			code_challenge: codeChallenge,
			code_challenge_method: 'S256',
			state,
		};

		return `${discovery.authorization_endpoint}?${stringify(query)}`;
	}

	async execTokenRequest(code, redirectUri, state = null) {
		if (!this.pendingAuth_) throw new Error('Missing pending OIDC authentication state');
		if (this.pendingAuth_.redirectUri !== redirectUri) throw new Error('Unexpected OIDC redirect URI');
		if (this.pendingAuth_.state !== state) throw new Error('Unexpected OIDC state value');

		const pendingAuth = this.pendingAuth_;
		this.pendingAuth_ = null;

		return this.execTokenRequest_({
			client_id: this.options_.clientId,
			code,
			code_verifier: pendingAuth.codeVerifier,
			redirect_uri: redirectUri,
			grant_type: 'authorization_code',
			client_secret: this.options_.clientSecret || '',
		});
	}

	async refreshAuthToken() {
		if (!this.auth_ || !this.auth_.refresh_token) throw new Error('Cannot refresh token: authentication data is missing. Starting the synchronisation again may fix the problem.');

		return this.execTokenRequest_({
			client_id: this.options_.clientId,
			refresh_token: this.auth_.refresh_token,
			grant_type: 'refresh_token',
			client_secret: this.options_.clientSecret || '',
		});
	}

	async ensureValidAccessToken(minValidityMs = 60 * 1000) {
		if (!this.auth_ || !this.auth_.access_token) return null;
		if (!this.auth_.expires_at) return this.auth_.access_token;
		if (!this.auth_.refresh_token) return this.auth_.access_token;
		if (this.auth_.expires_at - Date.now() > minValidityMs) return this.auth_.access_token;

		await this.refreshAuthToken();
		return this.auth() ? this.auth().access_token : null;
	}

	async discovery() {
		if (this.discovery_) return this.discovery_;

		const response = await shim.fetch(this.discoveryUrl(), {
			method: 'GET',
			headers: {
				Accept: 'application/json',
			},
		});

		const text = await response.text();
		if (!response.ok) throw new Error(`Could not retrieve OIDC discovery metadata: ${response.status}: ${response.statusText}: ${text}`);

		const discovery = JSON.parse(text);
		if (!discovery.authorization_endpoint || !discovery.token_endpoint) throw new Error('Invalid OIDC discovery metadata');

		this.discovery_ = discovery;
		return this.discovery_;
	}

	discoveryUrl() {
		const issuer = (this.options_.issuer || '').trim();
		if (!issuer) throw new Error('OIDC issuer or discovery URL is missing');
		if (issuer.includes('/.well-known/openid-configuration')) return issuer;

		const url = new URL(issuer);
		const pathname = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '');
		url.pathname = `${pathname ? `/.well-known/openid-configuration${pathname}` : '/.well-known/openid-configuration'}`;
		url.search = '';
		url.hash = '';
		return url.toString();
	}

	async execTokenRequest_(body) {
		const requestBody = { ...body };
		if (!requestBody.client_secret) delete requestBody.client_secret;

		const discovery = await this.discovery();
		const response = await shim.fetch(discovery.token_endpoint, {
			method: 'POST',
			body: urlUtils.objectToQueryString(requestBody),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Accept: 'application/json',
			},
		});

		const text = await response.text();
		if (!response.ok) {
			let errorCode = '';
			try {
				errorCode = JSON.parse(text).error || '';
			} catch (error) {
				errorCode = '';
			}

			if (['invalid_client', 'invalid_grant', 'unauthorized_client'].includes(errorCode)) this.setAuth(null);

			throw new Error(`Could not retrieve auth token: ${response.status}: ${response.statusText}: ${text}`);
		}

		const auth = JSON.parse(text);
		this.setAuth(auth);
		return this.auth();
	}

	normaliseAuth_(auth) {
		if (!auth) return null;

		const output = { ...auth };
		if (!output.expires_at && output.expires_in !== undefined) {
			output.expires_at = Date.now() + Number(output.expires_in) * 1000;
		}

		return output;
	}

	async codeChallenge_(value) {
		const digest = await shim.crypto.digest(Digest.sha256, new TextEncoder().encode(value));
		return this.base64UrlEncode_(digest);
	}

	async randomBase64Url_(byteCount) {
		const bytes = await shim.randomBytes(byteCount);
		return this.base64UrlEncode_(bytes);
	}

	base64UrlEncode_(value) {
		return Buffer.from(value).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
	}
}

module.exports = OidcApi;
module.exports.default = OidcApi;
