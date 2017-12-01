const fs = require('fs-extra');
const { shim } = require('lib/shim.js');
const { GeolocationNode } = require('lib/geolocation-node.js');
const { FileApiDriverLocal } = require('lib/file-api-driver-local.js');
const { time } = require('lib/time-utils.js');
const { setLocale, defaultLocale, closestSupportedLocale } = require('lib/locale.js');

// // Node requests can go wrong is so many different ways and with so
// // many different error messages... This handler inspects the error
// // and decides whether the request can safely be repeated or not.
// function fetchRequestCanBeRetried(error) {
// 	if (!error) return false;

// 	// Unfortunately the error 'Network request failed' doesn't have a type
// 	// or error code, so hopefully that message won't change and is not localized
// 	if (error.message == 'Network request failed') return true;

// 	// request to https://public-ch3302....1fab24cb1bd5f.md failed, reason: socket hang up"
// 	if (error.code == 'ECONNRESET') return true;

// 	// OneDrive (or Node?) sometimes sends back a "not found" error for resources
// 	// that definitely exist and in this case repeating the request works.
// 	// Error is:
// 	// request to https://graph.microsoft.com/v1.0/drive/special/approot failed, reason: getaddrinfo ENOTFOUND graph.microsoft.com graph.microsoft.com:443		
// 	if (error.code == 'ENOTFOUND') return true;

// 	// network timeout at: https://public-ch3302...859f9b0e3ab.md
// 	if (error.message && error.message.indexOf('network timeout') === 0) return true;

// 	// name: 'FetchError',
// 	// message: 'request to https://api.ipify.org/?format=json failed, reason: getaddrinfo EAI_AGAIN api.ipify.org:443',
// 	// type: 'system',
// 	// errno: 'EAI_AGAIN',
// 	// code: 'EAI_AGAIN' } } reason: { FetchError: request to https://api.ipify.org/?format=json failed, reason: getaddrinfo EAI_AGAIN api.ipify.org:443
// 	//
// 	// It's a Microsoft error: "A temporary failure in name resolution occurred."
// 	if (error.code == 'EAI_AGAIN') return true;

// 	// request to https://public-...8fd8bc6bb68e9c4d17a.md failed, reason: connect ETIMEDOUT 204.79.197.213:443
// 	// Code: ETIMEDOUT
// 	if (error.code === 'ETIMEDOUT') return true;

// 	return false;
// }

function shimInit() {
	shim.fs = fs;
	shim.FileApiDriverLocal = FileApiDriverLocal;
	shim.Geolocation = GeolocationNode;
	shim.FormData = require('form-data');

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
		const { Resource } = require('lib/models/resource.js');

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
		const { Resource } = require('lib/models/resource.js');
		const { uuid } = require('lib/uuid.js');
		const { basename, fileExtension, safeFileExtension } = require('lib/path-utils.js');
		const mime = require('mime/lite');
		const { Note } = require('lib/models/note.js');

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

		const newNote = Object.assign({}, note, {
			body: note.body + "\n\n" + Resource.markdownTag(resource),
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
}

module.exports = { shimInit };