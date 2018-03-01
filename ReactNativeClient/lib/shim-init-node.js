const fs = require('fs-extra');
const { shim } = require('lib/shim.js');
const { GeolocationNode } = require('lib/geolocation-node.js');
const { FileApiDriverLocal } = require('lib/file-api-driver-local.js');
const { time } = require('lib/time-utils.js');
const { setLocale, defaultLocale, closestSupportedLocale } = require('lib/locale.js');
const { FsDriverNode } = require('lib/fs-driver-node.js');

function shimInit() {
	shim.fsDriver = () => { throw new Error('Not implemented') }
	shim.FileApiDriverLocal = FileApiDriverLocal;
	shim.Geolocation = GeolocationNode;
	shim.FormData = require('form-data');
	shim.sjclModule = require('lib/vendor/sjcl.js');

	shim.fsDriver = () => {
		if (!shim.fsDriver_) shim.fsDriver_ = new FsDriverNode();
		return shim.fsDriver_;
	}

	shim.randomBytes = async (count) => {
		const buffer = require('crypto').randomBytes(count);
		return Array.from(buffer);
	}

	shim.detectAndSetLocale = function (Setting) {
		let locale = process.env.LANG;
		if (!locale) locale = defaultLocale();
		locale = locale.split('.');
		locale = locale[0];
		locale = closestSupportedLocale(locale);
		Setting.setValue('locale', locale);
		setLocale(locale);
		return locale;
	}

	const resizeImage_ = async function(filePath, targetPath) {
		const sharp = require('sharp');
		const Resource = require('lib/models/Resource.js');

		return new Promise((resolve, reject) => {
			sharp(filePath)
			.resize(Resource.IMAGE_MAX_DIMENSION, Resource.IMAGE_MAX_DIMENSION)
			.max()
			.withoutEnlargement()
			.toFile(targetPath, (err, info) => {
				if (err) {
					reject(err);
				} else {
					resolve(info);
				}
			});
		});
	}

	shim.attachFileToNote = async function(note, filePath) {
		const Resource = require('lib/models/Resource.js');
		const { uuid } = require('lib/uuid.js');
		const { basename, fileExtension, safeFileExtension } = require('lib/path-utils.js');
		const mime = require('mime/lite');
		const Note = require('lib/models/Note.js');

		if (!(await fs.pathExists(filePath))) throw new Error(_('Cannot access %s', filePath));

		let resource = Resource.new();
		resource.id = uuid.create();
		resource.mime = mime.getType(filePath);
		resource.title = basename(filePath);
		resource.file_extension = safeFileExtension(fileExtension(filePath));

		if (!resource.mime) resource.mime = 'application/octet-stream';

		let targetPath = Resource.fullPath(resource);

		if (resource.mime == 'image/jpeg' || resource.mime == 'image/jpg' || resource.mime == 'image/png') {
			const result = await resizeImage_(filePath, targetPath);
		} else {
			await fs.copy(filePath, targetPath, { overwrite: true });
		}

		await Resource.save(resource, { isNew: true });

		const newBody = [];
		if (note.body) newBody.push(note.body);
		newBody.push(Resource.markdownTag(resource));

		const newNote = Object.assign({}, note, {
			body: newBody.join('\n\n'),
		});
		return await Note.save(newNote);
	}

	const nodeFetch = require('node-fetch');

	shim.readLocalFileBase64 = (path) => {
		const data = fs.readFileSync(path);
		return new Buffer(data).toString('base64');
	}

	shim.fetch = async function(url, options = null) {
		return shim.fetchWithRetry(() => {
			return nodeFetch(url, options)
		}, options);
	}
	
	shim.fetchBlob = async function(url, options) {
		if (!options || !options.path) throw new Error('fetchBlob: target file path is missing');
		if (!options.method) options.method = 'GET';
		//if (!('maxRetry' in options)) options.maxRetry = 5;

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

		const doFetchOperation = async () => {
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
		};

		return shim.fetchWithRetry(doFetchOperation, options);
	}

	shim.uploadBlob = async function(url, options) {
		 if (!options || !options.path) throw new Error('uploadBlob: source file path is missing');
		const content = await fs.readFile(options.path);
		options = Object.assign({}, options, {
			body: content,
		});
		return shim.fetch(url, options);
	}

	shim.stringByteLength = function(string) {
		return Buffer.byteLength(string, 'utf-8');
	}

}

module.exports = { shimInit };