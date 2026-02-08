import { _ } from './locale';
import { BaseOAuthNodeUtils, OAuthDanceOptions } from './base-oauth-node-utils';

const http = require('http');

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- OneDriveApi is not typed
type OneDriveApi = any;

export default class OneDriveApiNodeUtils extends BaseOAuthNodeUtils<OneDriveApi> {
	public possibleOAuthDancePorts(): number[] {
		return [9967, 8967, 8867];
	}

	public async oauthDance(options: OAuthDanceOptions = {}): Promise<unknown> {
		// eslint-disable-next-line no-console -- Fallback to console when no log function provided
		const log = options.log || ((message: string) => console.log(message));

		this.api().setAuth(null);

		const port = await this.findPort();
		const authCodeUrl = this.api().authCodeUrl(`http://localhost:${port}`);

		return new Promise((resolve, reject) => {
			const server = this.createOAuthServer();
			const errorMessage: string | null = null;

			server.on('request', (request: typeof http.IncomingMessage, response: typeof http.ServerResponse) => {
				const url = this.parseUrl(request.url);

				if (url.pathname === '/auth') {
					response.writeHead(302, { Location: authCodeUrl });
					response.end();
					return;
				}

				const query = url.query;

				if (!query.code) {
					this.writeResponse(response, 400, '"code" query parameter is missing');
					return;
				}

				this.api()
					.execTokenRequest(query.code, `http://localhost:${port.toString()}`)
					// eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
					.then(() => {
						this.writeResponse(response, 200, _('The application has been authorised - you may now close this browser tab.'));
						log('');
						log(_('The application has been successfully authorised.'));
						this.waitAndDestroy();
					})
					// eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
					.catch((error: Error) => {
						this.writeResponse(response, 400, error.message);
						log('');
						log(error.message);
						this.waitAndDestroy();
					});
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

			log(_('Please open the following URL in your browser to authenticate the application. The application will create a directory in "Apps/Joplin" and will only read and write files in this directory. It will have no access to any files outside this directory nor to any other personal data. No data will be shared with any third party.'));
			log('');
			log(`http://127.0.0.1:${port}/auth`);
		});
	}
}

// Keep backwards compatibility with the old export
module.exports = { OneDriveApiNodeUtils: OneDriveApiNodeUtils };
