import shim from './shim';
import Logger from '@joplin/utils/Logger';
import { _ } from './locale';

const { stringify } = require('query-string');
const urlUtils = require('./urlUtils.js');

const logger = Logger.create('OidcApi');

export interface OidcAuth {
	access_token: string;
	refresh_token?: string;
	token_type: string;
	expires_in?: number;
	expires_at?: number;
	id_token?: string;
	scope?: string;
}

export interface OidcDiscoveryDocument {
	issuer: string;
	authorization_endpoint: string;
	token_endpoint: string;
	userinfo_endpoint?: string;
	end_session_endpoint?: string;
	jwks_uri?: string;
	scopes_supported?: string[];
	response_types_supported?: string[];
	grant_types_supported?: string[];
}

export interface OidcApiOptions {
	issuerUrl: string;
	clientId: string;
	clientSecret?: string;
	scope?: string;
	ignoreTlsErrors?: boolean;
}

export default class OidcApi {
	private options_: OidcApiOptions;
	private auth_: OidcAuth | null = null;
	private discoveryDocument_: OidcDiscoveryDocument | null = null;
	private listeners_: Record<string, ((auth: OidcAuth | null)=> void)[]>;

	public constructor(options: OidcApiOptions) {
		this.options_ = options;
		this.listeners_ = {
			authRefreshed: [],
		};
	}

	public dispatch(eventName: string, param: OidcAuth | null) {
		const ls = this.listeners_[eventName];
		for (let i = 0; i < ls.length; i++) {
			ls[i](param);
		}
	}

	public on(eventName: string, callback: (auth: OidcAuth | null)=> void) {
		this.listeners_[eventName].push(callback);
	}

	public off(eventName: string, callback: (auth: OidcAuth | null)=> void) {
		const index = this.listeners_[eventName].indexOf(callback);
		if (index >= 0) {
			this.listeners_[eventName].splice(index, 1);
		}
	}

	public auth(): OidcAuth | null {
		return this.auth_;
	}

	public setAuth(auth: OidcAuth | null) {
		if (auth && auth.expires_in && !auth.expires_at) {
			// Calculate absolute expiration time
			auth.expires_at = Date.now() + (auth.expires_in * 1000);
		}
		this.auth_ = auth;
		this.dispatch('authRefreshed', this.auth());
	}

	public token(): string | null {
		return this.auth_ ? this.auth_.access_token : null;
	}

	public issuerUrl(): string {
		return this.options_.issuerUrl.replace(/\/$/, '');
	}

	public clientId(): string {
		return this.options_.clientId;
	}

	public clientSecret(): string | undefined {
		return this.options_.clientSecret;
	}

	public scope(): string {
		return this.options_.scope || 'openid profile';
	}

	public ignoreTlsErrors(): boolean {
		return this.options_.ignoreTlsErrors || false;
	}

	private async fetchDiscoveryDocument(): Promise<OidcDiscoveryDocument> {
		if (this.discoveryDocument_) {
			return this.discoveryDocument_;
		}

		const discoveryUrl = `${this.issuerUrl()}/.well-known/openid-configuration`;

		const response = await shim.fetch(discoveryUrl, {
			method: 'GET',
			headers: {
				'Accept': 'application/json',
			},
			ignoreTlsErrors: this.ignoreTlsErrors(),
		});

		if (!response.ok) {
			const text = await response.text();
			throw new Error(`Failed to fetch OIDC discovery document from ${discoveryUrl}: ${response.status}: ${text}`);
		}

		this.discoveryDocument_ = await response.json();
		return this.discoveryDocument_;
	}

	public async authorizationEndpoint(): Promise<string> {
		const doc = await this.fetchDiscoveryDocument();
		return doc.authorization_endpoint;
	}

	public async tokenEndpoint(): Promise<string> {
		const doc = await this.fetchDiscoveryDocument();
		return doc.token_endpoint;
	}

	public async authCodeUrl(redirectUri: string, state?: string): Promise<string> {
		const authEndpoint = await this.authorizationEndpoint();

		const query: Record<string, string> = {
			client_id: this.clientId(),
			scope: this.scope(),
			response_type: 'code',
			redirect_uri: redirectUri,
		};

		if (state) {
			query.state = state;
		}

		return `${authEndpoint}?${stringify(query)}`;
	}

	public async execTokenRequest(code: string, redirectUri: string): Promise<void> {
		const tokenEndpoint = await this.tokenEndpoint();

		const body: Record<string, string> = {
			client_id: this.clientId(),
			code: code,
			redirect_uri: redirectUri,
			grant_type: 'authorization_code',
		};

		if (this.clientSecret()) {
			body.client_secret = this.clientSecret();
		}

		const response = await shim.fetch(tokenEndpoint, {
			method: 'POST',
			body: urlUtils.objectToQueryString(body),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			ignoreTlsErrors: this.ignoreTlsErrors(),
		});

		if (!response.ok) {
			const text = await response.text();
			throw new Error(`Could not exchange authorization code for token: ${response.status}: ${response.statusText}: ${text}`);
		}

		try {
			const json = await response.json();
			this.setAuth(json);
		} catch (error) {
			this.setAuth(null);
			const text = await response.text();
			(error as Error).message += `: ${text}`;
			throw error;
		}
	}

	public isTokenExpired(): boolean {
		if (!this.auth_) return true;
		if (!this.auth_.expires_at) return false;

		// Consider token expired 60 seconds before actual expiration
		const bufferMs = 60 * 1000;
		return Date.now() >= (this.auth_.expires_at - bufferMs);
	}

	public async refreshAccessToken(): Promise<void> {
		if (!this.auth_ || !this.auth_.refresh_token) {
			this.setAuth(null);
			throw new Error(_('Cannot refresh token: authentication data is missing. Starting the synchronisation again may fix the problem.'));
		}

		const tokenEndpoint = await this.tokenEndpoint();

		const body: Record<string, string> = {
			client_id: this.clientId(),
			refresh_token: this.auth_.refresh_token,
			grant_type: 'refresh_token',
		};

		if (this.clientSecret()) {
			body.client_secret = this.clientSecret();
		}

		logger.info('Refreshing OIDC access token...');

		const response = await shim.fetch(tokenEndpoint, {
			method: 'POST',
			body: urlUtils.objectToQueryString(body),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			ignoreTlsErrors: this.ignoreTlsErrors(),
		});

		if (!response.ok) {
			this.setAuth(null);
			const msg = await response.text();
			throw new Error(`Failed to refresh token: ${response.status}: ${msg}`);
		}

		const auth = await response.json();
		// Preserve refresh token if new one not provided
		if (!auth.refresh_token && this.auth_.refresh_token) {
			auth.refresh_token = this.auth_.refresh_token;
		}
		this.setAuth(auth);
		logger.info('OIDC access token refreshed successfully');
	}

	public async ensureValidToken(): Promise<string> {
		if (!this.auth_) {
			throw new Error('Not authenticated');
		}

		if (this.isTokenExpired()) {
			await this.refreshAccessToken();
		}

		return this.token();
	}
}
