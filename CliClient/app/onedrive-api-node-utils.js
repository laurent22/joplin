import { _ } from 'lib/locale.js'

const tcpPortUsed = require('tcp-port-used');
const http = require("http");
const urlParser = require("url");
const FormData = require('form-data');
const enableServerDestroy = require('server-destroy');

class OneDriveApiNodeUtils {

	constructor(api) {
		this.api_ = api;
	}

	api() {
		return this.api_;
	}

	possibleOAuthDancePorts() {
		return [1917, 9917, 8917];
	}

	async oauthDance(targetConsole = null) {
		if (targetConsole === null) targetConsole = console;

		this.api().setAuth(null);

		let ports = this.possibleOAuthDancePorts();
		let port = null;
		for (let i = 0; i < ports.length; i++) {
			let inUse = await tcpPortUsed.check(ports[i]);
			if (!inUse) {
				port = ports[i];
				break;
			}
		}

		if (!port) throw new Error(_('All potential ports are in use - please report the issue at %s', 'https://github.com/laurent22/joplin'));

		let authCodeUrl = this.api().authCodeUrl('http://localhost:' + port);

		return new Promise((resolve, reject) => {			
			let server = http.createServer();
			let errorMessage = null;

			server.on('request', (request, response) => {
				const query = urlParser.parse(request.url, true).query;

				function writeResponse(code, message) {
					response.writeHead(code, {"Content-Type": "text/html"});
					response.write(message);
					response.end();
				}

				if (!query.code) return writeResponse(400, '"code" query parameter is missing');

				this.api().execTokenRequest(query.code, 'http://localhost:' + port.toString()).then(() => {
					writeResponse(200, _('The application has been authorised - you may now close this browser tab.'));
					targetConsole.log('');
					targetConsole.log(_('The application has been successfully authorised.'));
					server.destroy();
				}).catch((error) => {
					writeResponse(400, error.message);
					targetConsole.log('');
					targetConsole.log(error.message);
					server.destroy();
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

			enableServerDestroy(server);

			targetConsole.log(_('Please open this URL in your browser to authenticate the application:'));
			targetConsole.log('');
			targetConsole.log(authCodeUrl);
		});
	}

}

export { OneDriveApiNodeUtils };