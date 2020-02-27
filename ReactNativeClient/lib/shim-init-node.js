const fs = require('fs-extra');
const { shim } = require('lib/shim.js');
const { GeolocationNode } = require('lib/geolocation-node.js');
const { FileApiDriverLocal } = require('lib/file-api-driver-local.js');
const { setLocale, defaultLocale, closestSupportedLocale } = require('lib/locale.js');
const { FsDriverNode } = require('lib/fs-driver-node.js');
const mimeUtils = require('lib/mime-utils.js').mime;
const Note = require('lib/models/Note.js');
const Resource = require('lib/models/Resource.js');
const urlValidator = require('valid-url');
const { _ } = require('lib/locale.js');
const http = require('http');
const https = require('https');

function shimInit() {
	shim.fsDriver = () => {
		throw new Error('Not implemented');
	};
	shim.FileApiDriverLocal = FileApiDriverLocal;
	shim.Geolocation = GeolocationNode;
	shim.FormData = require('form-data');
	shim.sjclModule = require('lib/vendor/sjcl.js');

	shim.fsDriver = () => {
		if (!shim.fsDriver_) shim.fsDriver_ = new FsDriverNode();
		return shim.fsDriver_;
	};

	shim.randomBytes = async count => {
		const buffer = require('crypto').randomBytes(count);
		return Array.from(buffer);
	};

	shim.detectAndSetLocale = function(Setting) {
		let locale = process.env.LANG;
		if (!locale) locale = defaultLocale();
		locale = locale.split('.');
		locale = locale[0];
		locale = closestSupportedLocale(locale);
		Setting.setValue('locale', locale);
		setLocale(locale);
		return locale;
	};

	shim.writeImageToFile = async function(nativeImage, mime, targetPath) {
		if (shim.isElectron()) {
			// For Electron
			let buffer = null;

			mime = mime.toLowerCase();

			if (mime === 'image/png') {
				buffer = nativeImage.toPNG();
			} else if (mime === 'image/jpg' || mime === 'image/jpeg') {
				buffer = nativeImage.toJPEG(90);
			}

			if (!buffer) throw new Error(`Cannot resize image because mime type "${mime}" is not supported: ${targetPath}`);

			await shim.fsDriver().writeFile(targetPath, buffer, 'buffer');
		} else {
			throw new Error('Node support not implemented');
		}
	};

	const resizeImage_ = async function(filePath, targetPath, mime) {
		const maxDim = Resource.IMAGE_MAX_DIMENSION;

		if (shim.isElectron()) {
			// For Electron
			const nativeImage = require('electron').nativeImage;
			let image = nativeImage.createFromPath(filePath);
			if (image.isEmpty()) throw new Error(`Image is invalid or does not exist: ${filePath}`);

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
		} else {
			// For the CLI tool
			const sharp = require('sharp');

			const image = sharp(filePath);
			const md = await image.metadata();

			if (md.width <= maxDim && md.height <= maxDim) {
				shim.fsDriver().copy(filePath, targetPath);
				return;
			}

			return new Promise((resolve, reject) => {
				image
					.resize(Resource.IMAGE_MAX_DIMENSION, Resource.IMAGE_MAX_DIMENSION, {
						fit: 'inside',
						withoutEnlargement: true,
					})
					.toFile(targetPath, (err, info) => {
						if (err) {
							reject(err);
						} else {
							resolve(info);
						}
					});
			});
		}
	};

	shim.createResourceFromPath = async function(filePath, defaultProps = null) {
		const readChunk = require('read-chunk');
		const imageType = require('image-type');

		const { uuid } = require('lib/uuid.js');
		const { basename, fileExtension, safeFileExtension } = require('lib/path-utils.js');

		if (!(await fs.pathExists(filePath))) throw new Error(_('Cannot access %s', filePath));

		defaultProps = defaultProps ? defaultProps : {};

		const resourceId = defaultProps.id ? defaultProps.id : uuid.create();

		let resource = Resource.new();
		resource.id = resourceId;
		resource.mime = mimeUtils.fromFilename(filePath);
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
			await resizeImage_(filePath, targetPath, resource.mime);
		} else {
			// const stat = await shim.fsDriver().stat(filePath);
			// if (stat.size >= 10000000) throw new Error('Resources larger than 10 MB are not currently supported as they may crash the mobile applications. The issue is being investigated and will be fixed at a later time.');

			await fs.copy(filePath, targetPath, { overwrite: true });
		}

		if (defaultProps) {
			resource = Object.assign({}, resource, defaultProps);
		}

		const itDoes = await shim.fsDriver().waitTillExists(targetPath);
		if (!itDoes) throw new Error(`Resource file was not created: ${targetPath}`);

		const fileStat = await shim.fsDriver().stat(targetPath);
		resource.size = fileStat.size;

		return Resource.save(resource, { isNew: true });
	};

	shim.attachFileToNote = async function(note, filePath, position = null, createFileURL = false) {
		const { basename } = require('path');
		const { escapeLinkText } = require('lib/markdownUtils');
		const { toFileProtocolPath } = require('lib/path-utils');

		let resource = [];
		if (!createFileURL) {
			resource = await shim.createResourceFromPath(filePath);
		}

		const newBody = [];

		if (position === null) {
			position = note.body ? note.body.length : 0;
		}

		if (note.body && position) newBody.push(note.body.substr(0, position));

		if (!createFileURL) {
			newBody.push(Resource.markdownTag(resource));
		} else {
			let filename = escapeLinkText(basename(filePath)); // to get same filename as standard drag and drop
			let fileURL = `[${filename}](${toFileProtocolPath(filePath)})`;
			newBody.push(fileURL);
		}

		if (note.body) newBody.push(note.body.substr(position));

		const newNote = Object.assign({}, note, {
			body: newBody.join('\n\n'),
		});
		return await Note.save(newNote);
	};

	shim.imageFromDataUrl = async function(imageDataUrl, filePath, options = null) {
		if (options === null) options = {};

		if (shim.isElectron()) {
			const nativeImage = require('electron').nativeImage;
			let image = nativeImage.createFromDataURL(imageDataUrl);
			if (image.isEmpty()) throw new Error('Could not convert data URL to image - perhaps the format is not supported (eg. image/gif)'); // Would throw for example if the image format is no supported (eg. image/gif)
			if (options.cropRect) {
				// Crop rectangle values need to be rounded or the crop() call will fail
				const c = options.cropRect;
				if ('x' in c) c.x = Math.round(c.x);
				if ('y' in c) c.y = Math.round(c.y);
				if ('width' in c) c.width = Math.round(c.width);
				if ('height' in c) c.height = Math.round(c.height);
				image = image.crop(c);
			}
			const mime = mimeUtils.fromDataUrl(imageDataUrl);
			await shim.writeImageToFile(image, mime, filePath);
		} else {
			if (options.cropRect) throw new Error('Crop rect not supported in Node');

			const imageDataURI = require('image-data-uri');
			const result = imageDataURI.decode(imageDataUrl);
			await shim.fsDriver().writeFile(filePath, result.dataBuffer, 'buffer');
		}
	};

	const nodeFetch = require('node-fetch');

	// Not used??
	shim.readLocalFileBase64 = path => {
		const data = fs.readFileSync(path);
		return new Buffer(data).toString('base64');
	};

	shim.fetch = async function(url, options = null) {
		const validatedUrl = urlValidator.isUri(url);
		if (!validatedUrl) throw new Error(`Not a valid URL: ${url}`);

		return shim.fetchWithRetry(() => {
			return nodeFetch(url, options);
		}, options);
	};

	shim.fetchBlob = async function(url, options) {
		if (!options || !options.path) throw new Error('fetchBlob: target file path is missing');
		if (!options.method) options.method = 'GET';
		// if (!('maxRetry' in options)) options.maxRetry = 5;

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
				text: () => {
					return response.statusMessage;
				},
				json: () => {
					return { message: `${response.statusCode}: ${response.statusMessage}` };
				},
				status: response.statusCode,
				headers: response.headers,
			};
		}

		const requestOptions = {
			protocol: url.protocol,
			host: url.hostname,
			port: url.port,
			method: method,
			path: url.pathname + (url.query ? `?${url.query}` : ''),
			headers: headers,
		};

		const doFetchOperation = async () => {
			return new Promise((resolve, reject) => {
				let file = null;

				const cleanUpOnError = error => {
					// We ignore any unlink error as we only want to report on the main error
					fs.unlink(filePath)
						.catch(() => {})
						.then(() => {
							if (file) {
								file.close(() => {
									file = null;
									reject(error);
								});
							} else {
								reject(error);
							}
						});
				};

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
					});

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
	};

	shim.uploadBlob = async function(url, options) {
		if (!options || !options.path) throw new Error('uploadBlob: source file path is missing');
		const content = await fs.readFile(options.path);
		options = Object.assign({}, options, {
			body: content,
		});
		return shim.fetch(url, options);
	};

	shim.stringByteLength = function(string) {
		return Buffer.byteLength(string, 'utf-8');
	};

	shim.Buffer = Buffer;

	shim.openUrl = url => {
		const { bridge } = require('electron').remote.require('./bridge');
		// Returns true if it opens the file successfully; returns false if it could
		// not find the file.
		return bridge().openExternal(url);
	};

	shim.httpAgent_ = null;

	shim.httpAgent = url => {
		if (shim.isLinux() && !shim.httpAgent) {
			var AgentSettings = {
				keepAlive: true,
				maxSockets: 1,
				keepAliveMsecs: 5000,
			};
			if (url.startsWith('https')) {
				shim.httpAgent_ = new https.Agent(AgentSettings);
			} else {
				shim.httpAgent_ = new http.Agent(AgentSettings);
			}
		}
		return shim.httpAgent_;
	};

	shim.openOrCreateFile = (filepath, defaultContents) => {
		// If the file doesn't exist, create it
		if (!fs.existsSync(filepath)) {
			fs.writeFile(filepath, defaultContents, 'utf-8', (error) => {
				if (error) {
					console.error(`error: ${error}`);
				}
			});
		}

		// Open the file
		return shim.openUrl(`file://${filepath}`);
	};

	shim.waitForFrame = () => {};

	shim.appVersion = () => {
		if (shim.isElectron()) {
			const p = require('../packageInfo.js');
			return p.version;
		}
		const p = require('../package.json');
		return p.version;
	};
}

module.exports = { shimInit };
