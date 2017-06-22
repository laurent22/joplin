require('source-map-support').install();
require('babel-plugin-transform-runtime');

import { OneDriveApi } from 'src/onedrive-api.js';

const fetch = require('node-fetch');
const tcpPortUsed = require('tcp-port-used');
const http = require("http");
const urlParser = require("url");
const FormData = require('form-data');

async function main() {
	let api = new OneDriveApi('e09fc0de-c958-424f-83a2-e56a721d331b', 'FAPky27RNWYuXWwThgkQE47');

	let ports = api.possibleOAuthFlowPorts();
	let port = null;
	for (let i = 0; i < ports.length; i++) {
		let inUse = await tcpPortUsed.check(ports[i]);
		if (!inUse) {
			port = ports[i];
			break;
		}
	}

	if (!port) throw new Error('All potential ports are in use - please report the issue at https://github.com/laurent22/joplin');

	let authCodeUrl = api.authCodeUrl('http://localhost:' + port);
	
	let server = http.createServer((request, response) => {
		const query = urlParser.parse(request.url, true).query;

		function writeResponse(code, message) {
			response.writeHead(code, {"Content-Type": "text/html"});
			response.write(message);
			response.end();
		}

		if (!query.code) return writeResponse(400, '"code" query parameter is missing');

		let url = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
		let body = new FormData();
		body.append('client_id', api.clientId());
		body.append('client_secret', api.clientSecret());
		body.append('code', query.code ? query.code : '');
		body.append('redirect_uri', 'http://localhost:' + port.toString());
		body.append('grant_type', 'authorization_code');

		let options = {
			method: 'POST',
			body: body,
		};

		fetch(url, options).then((r) => {
			if (!r.ok) {
				let msg = 'Could not retrieve auth code: ' + r.status + ': ' + r.statusText;
				console.info(msg);
				return writeResponse(400, msg);
			}
			return r.json().then((json) => {
				console.info(json);
				return writeResponse(200, 'The application has been authorised - you may now close this browser tab.');
			});
		});
	});

	server.listen(port);
	
	console.info(authCodeUrl);
}

main();