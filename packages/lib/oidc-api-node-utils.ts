import { _ } from './locale';
import OidcApi, { OidcAuth } from './OidcApi';
import { BaseOAuthNodeUtils, OAuthDanceOptions } from './base-oauth-node-utils';

const http = require('http');

export { OAuthDanceOptions } from './base-oauth-node-utils';

export class OidcApiNodeUtils extends BaseOAuthNodeUtils<OidcApi> {
	public possibleOAuthDancePorts(): number[] {
		return [9968, 8968, 8868];
	}

	public async oauthDance(options: OAuthDanceOptions = {}): Promise<OidcAuth | null> {
		const targetConsole = options.log ? { log: options.log } : console;

		this.api().setAuth(null);

		const port = await this.findPort();
		const redirectUri = `http://localhost:${port}`;
		const state = Math.random().toString(36).substring(7);
		const authCodeUrl = await this.api().authCodeUrl(redirectUri, state);

		return new Promise((resolve, reject) => {
			const server = this.createOAuthServer();
			let errorMessage: string | null = null;

			server.on('request', async (request: typeof http.IncomingMessage, response: typeof http.ServerResponse) => {
				const url = this.parseUrl(request.url);

				if (url.pathname === '/auth') {
					response.writeHead(302, { Location: authCodeUrl });
					response.end();
					return;
				}

				const query = url.query;

				if (query.error) {
					const errorDesc = query.error_description || query.error;
					errorMessage = `Authentication failed: ${errorDesc}`;
					this.writeResponse(response, 400, `<p class="error">${errorMessage}</p>`);
					this.waitAndDestroy();
					return;
				}

				if (!query.code) {
					this.writeResponse(response, 400, '<p class="error">"code" query parameter is missing</p>');
					return;
				}

				// Verify state to prevent CSRF
				if (query.state !== state) {
					this.writeResponse(response, 400, '<p class="error">Invalid state parameter</p>');
					return;
				}

				try {
					await this.api().execTokenRequest(query.code, redirectUri);
					this.writeResponse(response, 200, `<p class="success">${_('The application has been authorised - you may now close this browser tab.')}</p>`);
					targetConsole.log('');
					targetConsole.log(_('The application has been successfully authorised.'));
					this.waitAndDestroy();
				} catch (error) {
					const errorMsg = (error as Error).message;
					this.writeResponse(response, 400, `<p class="error">${errorMsg}</p>`);
					targetConsole.log('');
					targetConsole.log(errorMsg);
					errorMessage = errorMsg;
					this.waitAndDestroy();
				}
			});

			server.on('close', () => {
				if (errorMessage) {
					reject(new Error(errorMessage));
				} else {
					resolve(this.api().auth());
				}
			});

			server.listen(port);

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
