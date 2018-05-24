const { netUtils } = require('lib/net-utils');
const urlParser = require("url");
const Note = require('lib/models/Note');
const Folder = require('lib/models/Folder');
const Resource = require('lib/models/Resource');
const Setting = require('lib/models/Setting');
const { shim } = require('lib/shim');
const md5 = require('md5');
const { fileExtension, safeFileExtension, safeFilename, filename } = require('lib/path-utils');
const HtmlToMd = require('lib/HtmlToMd');
const { Logger } = require('lib/logger.js');
const markdownUtils = require('lib/markdownUtils');

class ClipperServer {

	constructor() {
		this.logger_ = new Logger();
	}

	setLogger(l) {
		this.logger_ = l;
	}

	logger() {
		return this.logger_;
	}

	htmlToMdParser() {
		if (this.htmlToMdParser_) return this.htmlToMdParser_;
		this.htmlToMdParser_ = new HtmlToMd();
		return this.htmlToMdParser_;
	}

	async requestNoteToNote(requestNote) {
		const output = {
			title: requestNote.title ? requestNote.title : '',
			body: requestNote.body ? requestNote.body : '',
		};

		if (requestNote.bodyHtml) {
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

		if (requestNote.url) output.source_url = requestNote.url;

		return output;
	}

	async downloadImage_(url) {
		const tempDir = Setting.value('tempDir');
		const name = filename(url);
		let fileExt = safeFileExtension(fileExtension(url).toLowerCase());
		if (fileExt) fileExt = '.' + fileExt;
		let imagePath = tempDir + '/' + safeFilename(name) + fileExt;
		if (await shim.fsDriver().exists(imagePath)) imagePath = tempDir + '/' + safeFilename(name) + '_' + md5(Math.random() + '_' + Date.now()).substr(0,10) + fileExt;

		try {
			const result = await shim.fetchBlob(url, { path: imagePath });
			return imagePath;
		} catch (error) {
			this.logger().warn('Cannot download image at ' + url, error);
			return '';
		}
	}

	async downloadImages_(urls) {
		const PromisePool = require('es6-promise-pool')

		const output = {};

		let urlIndex = 0;
		const promiseProducer = () => {
			if (urlIndex >= urls.length) return null;

			const url = urls[urlIndex++];

			return new Promise(async (resolve, reject) => {
				const imagePath = await this.downloadImage_(url);
				if (imagePath) output[url] = { path: imagePath };
				resolve();
			});
		}

		const concurrency = 3
		const pool = new PromisePool(promiseProducer, concurrency)
		await pool.start()

		return output;
	}

	async createResourcesFromPaths_(urls) {
		for (let url in urls) {
			if (!urls.hasOwnProperty(url)) continue;
			const urlInfo = urls[url];
			try {
				const resource = await shim.createResourceFromPath(urlInfo.path);
				urlInfo.resource = resource;
			} catch (error) {
				this.logger().warn('Cannot create resource for ' + url, error);
			}
		}
		return urls;
	}

	async removeTempFiles_(urls) {
		for (let url in urls) {
			if (!urls.hasOwnProperty(url)) continue;
			const urlInfo = urls[url];
			try {
				await shim.fsDriver().remove(urlInfo.path);
			} catch (error) {
				this.logger().warn('Cannot remove ' + urlInfo.path, error);
			}
		}
	}

	replaceImageUrlsByResources_(md, urls) {
		let output = md.replace(/(!\[.*?\]\()([^\s\)]+)(.*?\))/g, (match, before, imageUrl, after) => {
			const urlInfo = urls[imageUrl];
			if (!urlInfo || !urlInfo.resource) return before + imageUrl + after;
			const resourceUrl = Resource.internalUrl(urlInfo.resource);
			return before + resourceUrl + after;
		});

		return output;
	}

	async start() {
		const port = await netUtils.findAvailablePort([9967, 8967, 8867], 0); // TODO: Make it shared with OneDrive server
		if (!port) {
			this.logger().error('All potential ports are in use or not available.');
			return;
		}

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
				response.write(JSON.stringify(object));
				response.end();
			}

			const requestId = Date.now();
			this.logger().info('Request (' + requestId + '): ' + request.method + ' ' + request.url);

			if (request.method === 'POST') {
				const url = urlParser.parse(request.url, true);

				if (url.pathname === '/notes') {
					let body = '';

					request.on('data', (data) => {
						body += data;
					});

					request.on('end', async () => {
						try {
							const requestNote = JSON.parse(body);
							let note = await this.requestNoteToNote(requestNote);

							const imageUrls = markdownUtils.extractImageUrls(note.body);
							let result = await this.downloadImages_(imageUrls);
							result = await this.createResourcesFromPaths_(result);
							await this.removeTempFiles_(result);
							note.body = this.replaceImageUrlsByResources_(note.body, result);

							note = await Note.save(note);
							this.logger().info('Request (' + requestId + '): Created note ' + note.id);
							return writeResponseJson(200, note);
						} catch (error) {
							this.logger().error(error);
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

		this.logger().info('Starting Clipper server on port ' + port);

		server.listen(port);
	}

}

module.exports = ClipperServer;