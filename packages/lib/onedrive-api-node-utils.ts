import { _ } from './locale';
import { findAvailablePort } from './net-utils';
import shim from './shim';
import OneDriveApi from './onedrive-api';

import * as http from 'http';
import * as urlParser from 'url';
const enableServerDestroy = require('server-destroy');

interface DestroyableServer extends http.Server {
	destroy(): void;
}

interface TargetConsole {
	log(message: string): void;
}

// eslint-disable-next-line import/prefer-default-export -- preserves the destructured `{ OneDriveApiNodeUtils }` import shape used by callers
export class OneDriveApiNodeUtils {
	private api_: OneDriveApi;
	private oauthServer_: DestroyableServer | null = null;

	public constructor(api: OneDriveApi) {
		this.api_ = api;
	}

	public api() {
		return this.api_;
	}

	public possibleOAuthDancePorts() {
		return [9967, 8967, 8867];
	}

	public makePage(message: string) {
		const header = `
		<!doctype html>
		<html><head><meta charset="utf-8"></head><body>`;

		const footer = `
		</body></html>
		`;

		return header + message + footer;
	}

	public cancelOAuthDance() {
		if (!this.oauthServer_) return;
		this.oauthServer_.destroy();
	}

	public async oauthDance(targetConsole: TargetConsole | null = null) {
		const out: TargetConsole = targetConsole ?? console;

		this.api().setAuth(null);

		const port = await findAvailablePort(require('tcp-port-used'), this.possibleOAuthDancePorts(), 0);
		if (!port) throw new Error(_('All potential ports are in use - please report the issue at %s', 'https://github.com/laurent22/joplin'));

		const authCodeUrl = this.api().authCodeUrl(`http://localhost:${port}`);

		return new Promise((resolve, reject) => {
			this.oauthServer_ = http.createServer() as DestroyableServer;
			const errorMessage: string | null = null;

			this.oauthServer_.on('request', (request, response) => {
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
						this.oauthServer_.destroy();
						this.oauthServer_ = null;
					}, 1000);
				};

				if (!query.code) return writeResponse(400, '"code" query parameter is missing');

				this.api()
					.execTokenRequest(query.code as string, `http://localhost:${port.toString()}`)
				// eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
					.then(() => {
						writeResponse(200, _('The application has been authorised - you may now close this browser tab.'));
						out.log('');
						out.log(_('The application has been successfully authorised.'));
						waitAndDestroy();
					})
				// eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
					.catch((error: Error) => {
						writeResponse(400, error.message);
						out.log('');
						out.log(error.message);
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

			out.log(_('Please open the following URL in your browser to authenticate the application. The application will create a directory in "Apps/Joplin" and will only read and write files in this directory. It will have no access to any files outside this directory nor to any other personal data. No data will be shared with any third party.'));
			out.log('');
			out.log(`http://127.0.0.1:${port}/auth`);
		});
	}
}
