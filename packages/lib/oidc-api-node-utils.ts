import { _ } from './locale';
import { findAvailablePort } from './net-utils';
import shim from './shim';
import OidcApi from './OidcApi';

const http = require('http');
const urlParser = require('url');
const enableServerDestroy = require('server-destroy');

export interface OAuthDanceOptions {
	log?: (message: string)=> void;
}

export class OidcApiNodeUtils {
	private api_: OidcApi;
	private oauthServer_: ReturnType<typeof http.createServer> | null = null;

	public constructor(api: OidcApi) {
		this.api_ = api;
	}

	public api(): OidcApi {
		return this.api_;
	}

	public possibleOAuthDancePorts(): number[] {
		return [9968, 8968, 8868];
	}

	private makePage(message: string): string {
		const header = `
		<!doctype html>
		<html><head><meta charset="utf-8"><title>Joplin OIDC Authentication</title>
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

	public async oauthDance(options: OAuthDanceOptions = {}): Promise<ReturnType<OidcApi['auth']>> {
		const targetConsole = options.log ? { log: options.log } : console;

		this.api().setAuth(null);

		const port = await findAvailablePort(require('tcp-port-used'), this.possibleOAuthDancePorts(), 0);
		if (!port) throw new Error(_('All potential ports are in use - please report the issue at %s', 'https://github.com/laurent22/joplin'));

		const redirectUri = `http://localhost:${port}`;
		const state = Math.random().toString(36).substring(7);
		const authCodeUrl = await this.api().authCodeUrl(redirectUri, state);

		return new Promise((resolve, reject) => {
			this.oauthServer_ = http.createServer();
			let errorMessage: string | null = null;

			this.oauthServer_.on('request', async (request: typeof http.IncomingMessage, response: typeof http.ServerResponse) => {
				const url = urlParser.parse(request.url, true);

				if (url.pathname === '/auth') {
					response.writeHead(302, { Location: authCodeUrl });
					response.end();
					return;
				}

				const query = url.query;

				const writeResponse = (code: number, message: string) => {
					response.writeHead(code, { 'Content-Type': 'text/html' });
					response.write(this.makePage(message));
					response.end();
				};

				// After the response has been received, don't destroy the server right
				// away or the browser might display a connection reset error (even
				// though it worked).
				const waitAndDestroy = () => {
					shim.setTimeout(() => {
						if (this.oauthServer_) {
							this.oauthServer_.destroy();
							this.oauthServer_ = null;
						}
					}, 1000);
				};

				if (query.error) {
					const errorDesc = query.error_description || query.error;
					errorMessage = `Authentication failed: ${errorDesc}`;
					writeResponse(400, `<p class="error">${errorMessage}</p>`);
					waitAndDestroy();
					return;
				}

				if (!query.code) {
					writeResponse(400, '<p class="error">"code" query parameter is missing</p>');
					return;
				}

				// Verify state to prevent CSRF
				if (query.state !== state) {
					writeResponse(400, '<p class="error">Invalid state parameter</p>');
					return;
				}

				try {
					await this.api().execTokenRequest(query.code, redirectUri);
					writeResponse(200, `<p class="success">${_('The application has been authorised - you may now close this browser tab.')}</p>`);
					targetConsole.log('');
					targetConsole.log(_('The application has been successfully authorised.'));
					waitAndDestroy();
				} catch (error) {
					const errorMsg = (error as Error).message;
					writeResponse(400, `<p class="error">${errorMsg}</p>`);
					targetConsole.log('');
					targetConsole.log(errorMsg);
					errorMessage = errorMsg;
					waitAndDestroy();
				}
			});

			this.oauthServer_.on('close', () => {
				if (errorMessage) {
					reject(new Error(errorMessage));
				} else {
					resolve(this.api().auth());
				}
			});

			this.oauthServer_.listen(port);

			enableServerDestroy(this.oauthServer_);

			// Rather than displaying authCodeUrl directly, we go through the local
			// server. This is just so that the URL being displayed is shorter and
			// doesn't get cut in terminals (especially those that don't handle multi
			// lines URLs).

			targetConsole.log(_('Please open the following URL in your browser to authenticate with your OIDC provider.'));
			targetConsole.log('');
			targetConsole.log(`http://127.0.0.1:${port}/auth`);
		});
	}
}
