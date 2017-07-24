import fs from 'fs-extra';
import { shim } from 'lib/shim.js';
import { GeolocationNode } from 'lib/geolocation-node.js';
import { FileApiDriverLocal } from 'lib/file-api-driver-local.js';


function shimInit() {
	shim.fs = fs;
	shim.FileApiDriverLocal = FileApiDriverLocal;
	shim.Geolocation = GeolocationNode;
	shim.fetch = require('node-fetch');
	shim.FormData = require('form-data');
	
	shim.fetchBlob = async function(url, options) {
		if (!options || !options.path) throw new Error('fetchBlob: target file path is missing');
		if (!options.method) options.method = 'GET';

		const urlParse = require('url').parse;

		url = urlParse(url.trim());
		const http = url.protocol.toLowerCase() == 'http:' ? require('follow-redirects').http : require('follow-redirects').https;
		const headers = options.headers ? options.headers : {};
		const method = options.method ? options.method : 'GET';
		if (method != 'GET') throw new Error('Only GET is supported');
		const filePath = options.path;

		function makeResponse(response) {
			return {
				ok: response.statusCode < 400,
				path: filePath,
				text: () => { return response.statusMessage; },
				json: () => { return { message: response.statusCode + ': ' + response.statusMessage }; },
				status: response.statusCode,
				headers: response.headers,
			};
		}

		const requestOptions = {
			protocol: url.protocol,
			host: url.host,
			port: url.port,
			method: method,
			path: url.path + (url.query ? '?' + url.query : ''),
			headers: headers,
		};

		return new Promise((resolve, reject) => {
			try {
				// Note: relative paths aren't supported
				const file = fs.createWriteStream(filePath);

				const request = http.get(requestOptions, function(response) {
					response.pipe(file);

					file.on('finish', function() {
						file.close(() => {
							resolve(makeResponse(response));
						});
					});
				})

				request.on('error', function(error) {
					fs.unlink(filePath);
					reject(error);
				});
			} catch(error) {
				fs.unlink(filePath);
				reject(error);
			}
		});
	}
}

export { shimInit }