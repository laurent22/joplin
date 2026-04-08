const { _ } = require('./locale');
const { findAvailablePort } = require('./net-utils');
const shim = require('./shim').default;

const http = require('http');
const urlParser = require('url');
const enableServerDestroy = require('server-destroy');

class OidcApiNodeUtils {
	constructor(api) {
		this.api_ = api;
		this.oauthServer_ = null;
	}

	api() {
		return this.api_;
	}

	possibleOAuthDancePorts() {
		return [9967, 8967, 8867];
	}

	makePage(message) {
		const header = `
		<!doctype html>
		<html><head><meta charset="utf-8"></head><body>`;

		const footer = `
		</body></html>
		`;

		return header + message + footer;
	}

	cancelOAuthDance() {
		if (!this.oauthServer_) return;
		this.oauthServer_.destroy();
	}

	async oauthDance(targetConsole = null) {
		if (targetConsole === null) targetConsole = console;

		this.api().setAuth(null);

		const port = await findAvailablePort(require('tcp-port-used'), this.possibleOAuthDancePorts(), 0);
		if (!port) throw new Error(_('All potential ports are in use - please report the issue at %s', 'https://github.com/laurent22/joplin'));

		const redirectUri = `http://localhost:${port}`;
		const authCodeUrl = await this.api().authCodeUrl(redirectUri);

		return new Promise((resolve, reject) => {
			this.oauthServer_ = http.createServer();
			let caughtError = null;

			this.oauthServer_.on('request', (request, response) => {
				const url = urlParser.parse(request.url, true);

				if (url.pathname === '/auth') {
					response.writeHead(302, { Location: authCodeUrl });
					response.end();
					return;
				}

				const query = url.query;

				const writeResponse = (code, message) => {
					response.writeHead(code, { 'Content-Type': 'text/html' });
					response.write(this.makePage(message));
					response.end();
				};

				const waitAndDestroy = () => {
					shim.setTimeout(() => {
						this.oauthServer_.destroy();
						this.oauthServer_ = null;
					}, 1000);
				};

				if (query.error) {
					caughtError = new Error(`${query.error}: ${query.error_description || _('Authentication was cancelled or rejected.')}`);
					writeResponse(400, caughtError.message);
					waitAndDestroy();
					return;
				}

				if (!query.code) {
					caughtError = new Error('"code" query parameter is missing');
					writeResponse(400, caughtError.message);
					waitAndDestroy();
					return;
				}

				void (async () => {
					try {
						await this.api().execTokenRequest(query.code, redirectUri, query.state);
						writeResponse(200, _('The application has been authorised - you may now close this browser tab.'));
						targetConsole.log('');
						targetConsole.log(_('The application has been successfully authorised.'));
						waitAndDestroy();
					} catch (error) {
						caughtError = error;
						writeResponse(400, error.message);
						targetConsole.log('');
						targetConsole.log(error.message);
						waitAndDestroy();
					}
				})();
			});

			this.oauthServer_.on('close', () => {
				if (caughtError) {
					reject(caughtError);
				} else {
					resolve(this.api().auth());
				}
			});

			this.oauthServer_.listen(port);

			enableServerDestroy(this.oauthServer_);

			targetConsole.log(_('Please open the following URL in your browser to authenticate the application.'));
			targetConsole.log('');
			targetConsole.log(`http://127.0.0.1:${port}/auth`);
		});
	}
}

module.exports = OidcApiNodeUtils;
module.exports.default = OidcApiNodeUtils;
