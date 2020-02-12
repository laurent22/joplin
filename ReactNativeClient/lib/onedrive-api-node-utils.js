const { _ } = require('lib/locale.js');
const { netUtils } = require('lib/net-utils.js');

const http = require('http');
const urlParser = require('url');
const enableServerDestroy = require('server-destroy');

class OneDriveApiNodeUtils {
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

		const port = await netUtils.findAvailablePort(this.possibleOAuthDancePorts(), 0);
		if (!port) throw new Error(_('All potential ports are in use - please report the issue at %s', 'https://github.com/laurent22/joplin'));

		let authCodeUrl = this.api().authCodeUrl(`http://localhost:${port}`);

		return new Promise((resolve, reject) => {
			this.oauthServer_ = http.createServer();
			let errorMessage = null;

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

				// After the response has been received, don't destroy the server right
				// away or the browser might display a connection reset error (even
				// though it worked).
				const waitAndDestroy = () => {
					setTimeout(() => {
						this.oauthServer_.destroy();
						this.oauthServer_ = null;
					}, 1000);
				};

				if (!query.code) return writeResponse(400, '"code" query parameter is missing');

				this.api()
					.execTokenRequest(query.code, `http://localhost:${port.toString()}`)
					.then(() => {
						writeResponse(200, _('The application has been authorised - you may now close this browser tab.'));
						targetConsole.log('');
						targetConsole.log(_('The application has been successfully authorised.'));
						waitAndDestroy();
					})
					.catch(error => {
						writeResponse(400, error.message);
						targetConsole.log('');
						targetConsole.log(error.message);
						waitAndDestroy();
					});
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

			targetConsole.log(_('Please open the following URL in your browser to authenticate the application. The application will create a directory in "Apps/Joplin" and will only read and write files in this directory. It will have no access to any files outside this directory nor to any other personal data. No data will be shared with any third party.'));
			targetConsole.log('');
			targetConsole.log(`http://127.0.0.1:${port}/auth`);
		});
	}
}

module.exports = { OneDriveApiNodeUtils };
