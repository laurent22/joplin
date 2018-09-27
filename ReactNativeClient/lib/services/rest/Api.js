const { ltrimSlashes } = require('lib/path-utils.js');
const Folder = require('lib/models/Folder');
const Note = require('lib/models/Note');
const Tag = require('lib/models/Tag');
const Setting = require('lib/models/Setting');
const markdownUtils = require('lib/markdownUtils');
const mimeUtils = require('lib/mime-utils.js').mime;
const { Logger } = require('lib/logger.js');
const md5 = require('md5');
const { shim } = require('lib/shim');
const HtmlToMd = require('lib/HtmlToMd');
const { fileExtension, safeFileExtension, safeFilename, filename } = require('lib/path-utils');

class ApiError extends Error {

	constructor(message, httpCode = 400) {
		super(message);
		this.httpCode_ = httpCode;
	}

	get httpCode() {
		return this.httpCode_;
	}

}

class MethodNotAllowedError extends ApiError {

	constructor() {
		super('Method Not Allowed', 405);
	}

}

class NotFoundError extends ApiError {

	constructor() {
		super('Not Found', 404);
	}

}

class Api {

	constructor() {
		this.logger_ = new Logger();
	}

	async route(method, path, query = null, body = null) {
		path = ltrimSlashes(path);
		const callName = 'action_' + path;
		if (!this[callName]) throw new NotFoundError();

		try {
			return this[callName]({
				method: method,
				query: query ? query : {},
				body: body,
			});
		} catch (error) {
			if (!error.httpCode) error.httpCode = 500;
			throw error;
		}
	}

	setLogger(l) {
		this.logger_ = l;
	}

	logger() {
		return this.logger_;
	}

	fields_(request, defaultFields) {
		const query = request.query;
		if (!query || !query.fields) return defaultFields;
		const fields = query.fields.split(',').map(f => f.trim()).filter(f => !!f);
		return fields.length ? fields : defaultFields;
	}

	async action_ping(request) {
		if (request.method === 'GET') {
			return 'JoplinClipperServer';
		}
		throw new MethodNotAllowedError();
	}

	async action_folders(request) {
		if (request.method === 'GET') {
			return await Folder.allAsTree({ fields: this.fields_(request, ['id', 'parent_id', 'title']) });
		}

		throw new MethodNotAllowedError();
	}

	async action_tags(request) {
		if (request.method === 'GET') {
			return await Tag.all({ fields: this.fields_(request, ['id', 'title']) })
		}

		throw new MethodNotAllowedError();
	}

	async action_notes(request) {
		if (request.method === 'POST') {
			const requestId = Date.now();
			const requestNote = JSON.parse(request.body);
			let note = await this.requestNoteToNote(requestNote);

			const imageUrls = markdownUtils.extractImageUrls(note.body);

			this.logger().info('Request (' + requestId + '): Downloading images: ' + imageUrls.length);

			let result = await this.downloadImages_(imageUrls);

			this.logger().info('Request (' + requestId + '): Creating resources from paths: ' + Object.getOwnPropertyNames(result).length);

			result = await this.createResourcesFromPaths_(result);
			await this.removeTempFiles_(result);
			note.body = this.replaceImageUrlsByResources_(note.body, result);

			this.logger().info('Request (' + requestId + '): Saving note...');

			note = await Note.save(note);

			if (requestNote.tags) {
				const tagTitles = requestNote.tags.split(',');
				await Tag.setNoteTagsByTitles(note.id, tagTitles);
			}

			if (requestNote.image_data_url) {
				note = await this.attachImageFromDataUrl_(note, requestNote.image_data_url, requestNote.crop_rect);
			}

			this.logger().info('Request (' + requestId + '): Created note ' + note.id);
			
			return note;
		}

		throw new MethodNotAllowedError();
	}





	// ========================================================================================================================
	// UTILIY FUNCTIONS
	// ========================================================================================================================

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

		if (requestNote.body_html) {
			// Parsing will not work if the HTML is not wrapped in a top level tag, which is not guaranteed
			// when getting the content from elsewhere. So here wrap it - it won't change anything to the final
			// rendering but it makes sure everything will be parsed.
			output.body = await this.htmlToMdParser().parse('<div>' + requestNote.body_html + '</div>', {
				baseUrl: requestNote.base_url ? requestNote.base_url : '',
			});
		}

		if (requestNote.parent_id) {
			output.parent_id = requestNote.parent_id;
		} else {
			const folder = await Folder.defaultFolder();
			if (!folder) throw new Error('Cannot find folder for note');
			output.parent_id = folder.id;
		}

		if (requestNote.source_url) output.source_url = requestNote.source_url;
		if (requestNote.author) output.author = requestNote.author;

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

		const isDataUrl = url && url.toLowerCase().indexOf('data:') === 0;

		const name = isDataUrl ? md5(Math.random() + '_' + Date.now()) : filename(url);
		let fileExt = isDataUrl ? mimeUtils.toFileExtension(mimeUtils.fromDataUrl(url)) : safeFileExtension(fileExtension(url).toLowerCase());
		if (fileExt) fileExt = '.' + fileExt;
		let imagePath = tempDir + '/' + safeFilename(name) + fileExt;
		if (await shim.fsDriver().exists(imagePath)) imagePath = tempDir + '/' + safeFilename(name) + '_' + md5(Math.random() + '_' + Date.now()).substr(0,10) + fileExt;

		try {
			if (isDataUrl) {
				await shim.imageFromDataUrl(url, imagePath);
			} else {
				await shim.fetchBlob(url, { path: imagePath });
			}
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


}

module.exports = Api;