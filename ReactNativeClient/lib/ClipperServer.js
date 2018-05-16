const { netUtils } = require('lib/net-utils');
const urlParser = require("url");
const Note = require('lib/models/Note');
const Folder = require('lib/models/Folder');
const HtmlToMd = require('lib/HtmlToMd');

class ClipperServer {

	htmlToMdParser() {
		if (this.htmlToMdParser_) return this.htmlToMdParser_;
		this.htmlToMdParser_ = new HtmlToMd();
		return this.htmlToMdParser_;
	}

	readabilityProcess(url) {
		return new Promise((resolve, reject) => {
			// const Readability = require('readability-node').Readability;

			// var location = document.location;
			// var uri = {
			//   spec: location.href,
			//   host: location.host,
			//   prePath: location.protocol + "//" + location.host,
			//   scheme: location.protocol.substr(0, location.protocol.indexOf(":")),
			//   pathBase: location.protocol + "//" + location.host + location.pathname.substr(0, location.pathname.lastIndexOf("/") + 1)
			// };
			// var article = new Readability(uri, document).parse();

			// const read = require('node-readability');

			// read(url, function(error, article, meta) {
			// 	if (error) {
			// 		reject(error);
			// 		return;
			// 	}

			// 	const output = {
			// 		body: article.content,
			// 		title: article.title,
			// 	}

			// 	article.close();
			// 	resolve(output);
			// });

			// // Main Article
			// console.log(article.content);
			// // Title
			// console.log(article.title);

			// // HTML Source Code
			// console.log(article.html);
			// // DOM
			// console.log(article.document);

			// // Response Object from Request Lib
			// console.log(meta);

			// // Close article to clean up jsdom and prevent leaks
			// article.close();
		});
	}

	async requestNoteToNote(requestNote) {
		// if (requestNote.url) {
		// 	console.info('Clipper: Got URL: ' + requestNote.url);
		// 	const result = await this.readabilityProcess(requestNote.url);
			
		// 	return {
		// 		title: result.title,
		// 		body: result.body,
		// 	}
		// } else {
			const output = {
				title: requestNote.title ? requestNote.title : '',
				body: requestNote.body ? requestNote.body : '',
			};

			if (requestNote.bodyHtml) {
				console.info(requestNote.bodyHtml);
				
				// Parsing will not work if the HTML is not wrapped in a top level tag, which is not guaranteed
				// when getting the content from elsewhere. So here wrap it - it won't change anything to the final
				// rendering but it makes sure everything will be parsed.
				output.body = await this.htmlToMdParser().parse('<div>' + requestNote.bodyHtml + '</div>', {
					baseUrl: requestNote.baseUrl ? requestNote.baseUrl : '',
				});
			}

			if (requestNote.parent_id) {
				output.parent_id = requestNote.parent_id;
			} else {
				const folder = await Folder.defaultFolder();
				if (!folder) throw new Error('Cannot find folder for note');
				output.parent_id = folder.id;
			}

			return output;
		// }
	}

	async start() {
		const port = await netUtils.findAvailablePort([9967, 8967, 8867], 0); // TODO: Make it shared with OneDrive server
		if (!port) throw new Error('All potential ports are in use or not available.');

		const server = require('http').createServer();

		server.on('request', (request, response) => {

			const writeCorsHeaders = (code) => {
				response.writeHead(code, {
					"Content-Type": "application/json",
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
					'Access-Control-Allow-Headers': 'X-Requested-With,content-type',
				});
			}

			const writeResponseJson = (code, object) => {
				writeCorsHeaders(code);
				// response.writeHead(code, {
				// 	"Content-Type": "application/json",
				// 	'Access-Control-Allow-Origin': '*',
				// 	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
				// 	'Access-Control-Allow-Headers': 'X-Requested-With,content-type',
				// });
				response.write(JSON.stringify(object));
				response.end();
			}

			console.info('GOT REQUEST', request.method + ' ' + request.url);

			if (request.method === 'POST') {
				const url = urlParser.parse(request.url, true);

				if (url.pathname === '/notes') {
					let body = '';

					request.on('data', (data) => {
						body += data;
					});

					request.on('end', async () => {
						try {
							// console.info('GOT BODY', body);
							const requestNote = JSON.parse(body);
							// console.info('GOT REQUEST', 
							let note = await this.requestNoteToNote(requestNote);
							note = await Note.save(note);
							return writeResponseJson(200, note);
						} catch (error) {
							console.warn(error);
							return writeResponseJson(400, { errorCode: 'exception', errorMessage: error.message });
						}
					});
				} else {
					return writeResponseJson(404, { errorCode: 'not_found' });
				}
			} else if (request.method === 'OPTIONS') {
				writeCorsHeaders(200);
				response.end();
			} else {
				return writeResponseJson(405, { errorCode: 'method_not_allowed' });
			}
		});

		server.on('close', () => {

		});

		console.info('Starting Clipper server on port ' + port);

		server.listen(port);
	}

}

module.exports = ClipperServer;