const fs = require('fs-extra');
const { shim } = require('lib/shim.js');
const { GeolocationNode } = require('lib/geolocation-node.js');
const { FileApiDriverLocal } = require('lib/file-api-driver-local.js');
const { time } = require('lib/time-utils.js');
const { setLocale, defaultLocale, closestSupportedLocale } = require('lib/locale.js');
const { FsDriverNode } = require('lib/fs-driver-node.js');
const mimeUtils = require('lib/mime-utils.js').mime;
const urlValidator = require('valid-url');

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

	shim.writeImageToFile = async function(nativeImage, mime, targetPath) {
		if (shim.isElectron()) { // For Electron
			let buffer = null;

			mime = mime.toLowerCase();

			if (mime === 'image/png') {
				buffer = nativeImage.toPNG();
			} else if (mime === 'image/jpg' || mime === 'image/jpeg') {
				buffer = nativeImage.toJPEG(90);
			}

			if (!buffer) throw new Error('Cannot resize image because mime type "' + mime + '" is not supported: ' + targetPath);

			await shim.fsDriver().writeFile(targetPath, buffer, 'buffer');
		} else {
			throw new Error('Node support not implemented');
		}
	}

	const resizeImage_ = async function(filePath, targetPath, mime) {
		if (shim.isElectron()) { // For Electron
			const nativeImage = require('electron').nativeImage;
			let image = nativeImage.createFromPath(filePath);
			if (image.isEmpty()) throw new Error('Image is invalid or does not exist: ' + filePath);

			const maxDim = Resource.IMAGE_MAX_DIMENSION;
			const size = image.getSize();

			if (size.width <= maxDim && size.height <= maxDim) {
				shim.fsDriver().copy(filePath, targetPath);
				return;
			}

			const options = {};
			if (size.width > size.height) {
				options.width = maxDim;
			} else {
				options.height = maxDim;
			}

			image = image.resize(options);

			await shim.writeImageToFile(image, mime, targetPath);
		} else { // For the CLI tool
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
	}

	shim.createResourceFromPath = async function(filePath) {
		const readChunk = require('read-chunk');
		const imageType = require('image-type');

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

		let fileExt = safeFileExtension(fileExtension(filePath));

		if (!resource.mime) {
			const buffer = await readChunk(filePath, 0, 64);
			const detectedType = imageType(buffer);

			if (detectedType) {
				fileExt = detectedType.ext;
				resource.mime = detectedType.mime;
			} else {
				resource.mime = 'application/octet-stream';
			}
		}

		resource.file_extension = fileExt;

		let targetPath = Resource.fullPath(resource);

		if (resource.mime == 'image/jpeg' || resource.mime == 'image/jpg' || resource.mime == 'image/png') {
			const result = await resizeImage_(filePath, targetPath, resource.mime);
		} else {
			const stat = await shim.fsDriver().stat(filePath);
			if (stat.size >= 10000000) throw new Error('Resources larger than 10 MB are not currently supported as they may crash the mobile applications. The issue is being investigated and will be fixed at a later time.');

			await fs.copy(filePath, targetPath, { overwrite: true });
		}

		await Resource.save(resource, { isNew: true });

		return resource;
	}

	shim.attachFileToNote = async function(note, filePath, position = null) {
		const resource = await shim.createResourceFromPath(filePath);

		const newBody = [];

		if (position === null) {
			position = note.body ? note.body.length : 0;
		}

		if (note.body && position) newBody.push(note.body.substr(0, position));
		newBody.push(Resource.markdownTag(resource));
		if (note.body) newBody.push(note.body.substr(position));

		const newNote = Object.assign({}, note, {
			body: newBody.join('\n\n'),
		});
		return await Note.save(newNote);
	}

	shim.imageFromDataUrl = async function(imageDataUrl, filePath, options = null) {
		if (options === null) options = {};

		if (shim.isElectron()) {
			const nativeImage = require('electron').nativeImage;
			let image = nativeImage.createFromDataURL(imageDataUrl);
			if (options.cropRect) image = image.crop(options.cropRect);
			const mime = mimeUtils.fromDataUrl(imageDataUrl);
			await shim.writeImageToFile(image, mime, filePath);
		} else {
			throw new Error('Node support not implemented');
		}
	}

	const nodeFetch = require('node-fetch');

	shim.readLocalFileBase64 = (path) => {
		const data = fs.readFileSync(path);
		return new Buffer(data).toString('base64');
	}

	shim.fetch = async function(url, options = null) {
		const validatedUrl = urlValidator.isUri(url);
		if (!validatedUrl) throw new Error('Not a valid URL: ' + url);

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
		const method = options.method ? options.method : 'GET';
		const http = url.protocol.toLowerCase() == 'http:' ? require('follow-redirects').http : require('follow-redirects').https;
		const headers = options.headers ? options.headers : {};
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
			host: url.hostname,
			port: url.port,
			method: method,
			path: url.path + (url.query ? '?' + url.query : ''),
			headers: headers,
		};

		const doFetchOperation = async () => {
			return new Promise((resolve, reject) => {
				let file = null;

				const cleanUpOnError = (error) => {
					// We ignore any unlink error as we only want to report on the main error
					fs.unlink(filePath).catch(() => {}).then(() => {
						if (file) {
							file.close(() => {
								file = null;
								reject(error);
							});
						} else {
							reject(error);
						}						
					});
				}

				try {
					// Note: relative paths aren't supported
					file = fs.createWriteStream(filePath);

					file.on('error', function(error) {
						cleanUpOnError(error);
					});

					const request = http.request(requestOptions, function(response) {
						response.pipe(file);

						file.on('finish', function() {
							file.close(() => {
								resolve(makeResponse(response));
							});
						});
					})

					request.on('error', function(error) {
						cleanUpOnError(error);
					});

					request.end();
				} catch (error) {
					cleanUpOnError(error);
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

	shim.Buffer = Buffer;

	shim.openUrl = (url) => {
		const { bridge } = require('electron').remote.require('./bridge');
		bridge().openExternal(url)
	}

}

module.exports = { shimInit };