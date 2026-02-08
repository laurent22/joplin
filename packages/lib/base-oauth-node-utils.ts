import { _ } from './locale';
import { findAvailablePort } from './net-utils';
import shim from './shim';

const http = require('http');
const urlParser = require('url');
const enableServerDestroy = require('server-destroy');

export interface OAuthDanceOptions {
	log?: (message: string)=> void;
}

export interface OAuthApi {
	setAuth(auth: unknown): void;
	auth(): unknown;
	execTokenRequest(code: string, redirectUri: string): Promise<void>;
}

export interface OAuthDanceConfig {
	authCodeUrl: string;
	redirectUri: string;
	state?: string;
	successMessage: string;
}

export type OAuthServerType = ReturnType<typeof http.createServer>;

export abstract class BaseOAuthNodeUtils<T extends OAuthApi> {
	protected api_: T;
	protected oauthServer_: OAuthServerType | null = null;

	public constructor(api: T) {
		this.api_ = api;
	}

	public api(): T {
		return this.api_;
	}

	public abstract possibleOAuthDancePorts(): number[];

	protected makePage(message: string): string {
		const header = `
		<!doctype html>
		<html><head><meta charset="utf-8"><title>Joplin Authentication</title>
		<style>
			body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
				   max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
			.success { color: #28a745; }
			.error { color: #dc3545; }
		</style>
		</head><body>`;

		const footer = `
		</body></html>
		`;

		return header + message + footer;
	}

	public cancelOAuthDance(): void {
		if (!this.oauthServer_) return;
		this.oauthServer_.destroy();
	}

	protected async findPort(): Promise<number> {
		const port = await findAvailablePort(require('tcp-port-used'), this.possibleOAuthDancePorts(), 0);
		if (!port) throw new Error(_('All potential ports are in use - please report the issue at %s', 'https://github.com/laurent22/joplin'));
		return port;
	}

	protected createOAuthServer(): OAuthServerType {
		this.oauthServer_ = http.createServer();
		enableServerDestroy(this.oauthServer_);
		return this.oauthServer_;
	}

	protected waitAndDestroy(): void {
		shim.setTimeout(() => {
			if (this.oauthServer_) {
				this.oauthServer_.destroy();
				this.oauthServer_ = null;
			}
		}, 1000);
	}

	protected writeResponse(response: typeof http.ServerResponse, code: number, message: string): void {
		response.writeHead(code, { 'Content-Type': 'text/html' });
		response.write(this.makePage(message));
		response.end();
	}

	protected parseUrl(url: string): { pathname: string; query: Record<string, string> } {
		return urlParser.parse(url, true);
	}
}
