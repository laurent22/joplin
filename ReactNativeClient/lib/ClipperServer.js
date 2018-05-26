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
const mimeUtils = require('lib/mime-utils.js').mime;
const randomClipperPort = require('lib/randomClipperPort');
const enableServerDestroy = require('server-destroy');

class ClipperServer {

	constructor() {
		this.logger_ = new Logger();
		this.startState_ = 'idle';
		this.server_ = null;
		this.port_ = null;
	}

	static instance() {
		if (this.instance_) return this.instance_;
		this.instance_ = new ClipperServer();
		return this.instance_;
	}

	setLogger(l) {
		this.logger_ = l;
	}

	logger() {
		return this.logger_;
	}

	setDispatch(d) {
		this.dispatch_ = d;
	}

	dispatch(action) {
		if (!this.dispatch_) throw new Error('dispatch not set!');
		this.dispatch_(action);
	}

	setStartState(v) {
		if (this.startState_ === v) return;
		this.startState_ = v;
		this.dispatch({
			type: 'CLIPPER_SERVER_SET',
			startState: v,
		});
	}

	setPort(v) {
		if (this.port_ === v) return;
		this.port_ = v;
		this.dispatch({
			type: 'CLIPPER_SERVER_SET',
			port: v,
		});
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

		if (requestNote.parentId) {
			output.parent_id = requestNote.parentId;
		} else {
			const folder = await Folder.defaultFolder();
			if (!folder) throw new Error('Cannot find folder for note');
			output.parent_id = folder.id;
		}

		if (requestNote.url) output.source_url = requestNote.url;

		return output;
	}

	// Note must have been saved first
	async attachImageFromDataUrl_(note, imageDataUrl, cropRect) {
		const tempDir = Setting.value('tempDir');
		const mime = mimeUtils.fromDataUrl(imageDataUrl);
		let ext = mimeUtils.toFileExtension(mime) || '';
		if (ext) ext = '.' + ext;
		const tempFilePath = tempDir + '/' + md5(Math.random() + '_' + Date.now()) + ext;
		const imageConvOptions = {};
		if (cropRect) imageConvOptions.cropRect = cropRect;
		await shim.imageFromDataUrl(imageDataUrl, tempFilePath, imageConvOptions);
		return await shim.attachFileToNote(note, tempFilePath);
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

	async findAvailablePort() {
		const tcpPortUsed = require('tcp-port-used');

		let state = null;
		for (let i = 0; i < 10000; i++) {
			state = randomClipperPort(state, Setting.value('env'));
			const inUse = await tcpPortUsed.check(state.port);
			if (!inUse) return state.port;
		}

		throw new Error('All potential ports are in use or not available.')
	}

	async start() {
		this.setPort(null);

		this.setStartState('starting');

		try {
			const p = await this.findAvailablePort();
			this.setPort(p);
		} catch (error) {
			this.setStartState('idle');
			this.logger().error(error);
			return;
		}

		this.server_ = require('http').createServer();

		this.server_.on('request', async (request, response) => {

			const writeCorsHeaders = (code, contentType = "application/json") => {
				response.writeHead(code, {
					"Content-Type": contentType,
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

			const writeResponseText = (code, text) => {
				writeCorsHeaders(code, 'text/plain');
				response.write(text);
				response.end();
			}

			const requestId = Date.now();
			this.logger().info('Request (' + requestId + '): ' + request.method + ' ' + request.url);

			const url = urlParser.parse(request.url, true);

			if (request.method === 'GET') {
				if (url.pathname === '/ping') {
					return writeResponseText(200, 'JoplinClipperServer');
				}

				if (url.pathname === '/folders') {
					const structure = await Folder.allAsTree({ fields: ['id', 'parent_id', 'title'] });
					return writeResponseJson(200, structure);
				}
			} else if (request.method === 'POST') {
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

							if (requestNote.imageDataUrl) {
								await this.attachImageFromDataUrl_(note, requestNote.imageDataUrl, requestNote.cropRect);
							}

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

		this.server_.on('close', () => {

		});

		enableServerDestroy(this.server_);

		this.logger().info('Starting Clipper server on port ' + this.port_);

		this.server_.listen(this.port_);

		this.setStartState('started');
	}

	async stop() {
		this.server_.destroy();
		this.server_ = null;
		this.setStartState('idle');
		this.setPort(null);
	}

}

module.exports = ClipperServer;