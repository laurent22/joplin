/* eslint-disable @typescript-eslint/no-explicit-any */
import { _ } from './locale';
import { findAvailablePort } from './net-utils';
import shim from './shim';
import * as http from 'http';
import * as urlParser from 'url';
const enableServerDestroy = require('server-destroy');

export default class OneDriveApiNodeUtils {
	private api_: any;
	private oauthServer_: any;

	public constructor(api: any) {
		this.api_ = api;
		this.oauthServer_ = null;
	}

	public api() {
		return this.api_;
	}

	public possibleOAuthDancePorts() {
		return [9967, 8967, 8867];
	}

	private makePage(message: string) {
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

	public async oauthDance(targetConsole: any = null) {
		if (targetConsole === null) targetConsole = console;

		this.api().setAuth(null);

		const port = await findAvailablePort(require('tcp-port-used'), this.possibleOAuthDancePorts(), 0);
		if (!port) throw new Error(_('All potential ports are in use - please report the issue at %s', 'https://github.com/laurent22/joplin'));

		const authCodeUrl = this.api().authCodeUrl(`http://localhost:${port}`);

		return new Promise((resolve, reject) => {
			this.oauthServer_ = http.createServer();
			const errorMessage: string = null;

			this.oauthServer_.on('request', async (request: http.IncomingMessage, response: http.ServerResponse) => {
				const url = urlParser.parse(request.url || '', true);

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

				const waitAndDestroy = () => {
					shim.setTimeout(() => {
						if (this.oauthServer_) {
							this.oauthServer_.destroy();
							this.oauthServer_ = null;
						}
					}, 1000);
				};

				if (!query.code) return writeResponse(400, '"code" query parameter is missing');

				try {
					await this.api().execTokenRequest(query.code, `http://localhost:${port.toString()}`);
					writeResponse(200, _('The application has been authorised - you may now close this browser tab.'));
					targetConsole.log('');
					targetConsole.log(_('The application has been successfully authorised.'));
					waitAndDestroy();
				} catch (error) {
					writeResponse(400, (error as Error).message);
					targetConsole.log('');
					targetConsole.log((error as Error).message);
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

			targetConsole.log(_('Please open the following URL in your browser to authenticate the application. The application will create a directory in "Apps/Joplin" and will only read and write files in this directory. It will have no access to any files outside this directory nor to any other personal data. No data will be shared with any third party.'));
			targetConsole.log('');
			targetConsole.log(`http://127.0.0.1:${port}/auth`);
		});
	}
}
