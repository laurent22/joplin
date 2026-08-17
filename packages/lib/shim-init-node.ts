import shim, { CreatePdfFromImagesOptions, CreateResourceFromPathOptions, HttpAgentOptions, PdfInfo, PdfPageImage } from './shim';
import createAccessiblePdf from './services/ocr/utils/createAccessiblePdf';
import GeolocationNode from './geolocation-node';
import { setLocale, defaultLocale, closestSupportedLocale } from './locale';
import FsDriverNode from './fs-driver-node';
import Note from './models/Note';
import Resource from './models/Resource';
import { basename, fileExtension, safeFileExtension } from './path-utils';
import fs from 'fs-extra';
import { writeFile } from 'fs/promises';
import { ResourceEntity } from './services/database/types';
import replaceUnsupportedCharacters from './utils/replaceUnsupportedCharacters';
import { FetchBlobOptions } from './types';
import { fromFile as fileTypeFromFile } from 'file-type';
import crypto from './services/e2ee/crypto';
import fastDeepEqual = require('fast-deep-equal');

import FileApiDriverLocal from './file-api-driver-local';
import * as mimeUtils from './mime-utils';
import BaseItem from './models/BaseItem';
import { Size } from '@joplin/utils/types';
import { cpus } from 'os';
import { pathToFileURL } from 'url';
// Use fetch from undici rather than the built-in fetch: Undici's fetch provides
// more information when fetch fails.
import { Agent, Request, Response, Headers, fetch, FormData, ProxyAgent, interceptors } from 'undici';
import tls from 'tls';
import type PdfJs from './utils/types/pdfJs';
import { _ } from './locale';
const toRelative = require('relative');
import timers from 'timers';
import dgram from 'dgram';
import { pipeline } from 'stream/promises';
import { createPrivateKey } from 'crypto';
import { Second } from '@joplin/utils/time';

interface ProxySettings {
	maxConcurrentConnections?: number;
	proxyTimeout?: number;
	proxyEnabled?: boolean;
	proxyUrl?: string;
}
const proxySettings: ProxySettings = {};

function resolveProxyUrl(proxyUrl: string) {
	return (
		proxyUrl ||
		process.env['http_proxy'] ||
		process.env['https_proxy'] ||
		process.env['HTTP_PROXY'] ||
		process.env['HTTPS_PROXY']
	);
}

// https://github.com/sindresorhus/callsites/blob/main/index.js
function callsites(): NodeJS.CallSite[] {
	const _prepareStackTrace = Error.prepareStackTrace;
	Error.prepareStackTrace = (_any, stack) => stack;
	const stack = (new Error().stack as unknown as NodeJS.CallSite[]).slice(1);
	Error.prepareStackTrace = _prepareStackTrace;
	return stack;
}

function setupProxySettings(options: ProxySettings) {
	proxySettings.maxConcurrentConnections = options.maxConcurrentConnections;
	proxySettings.proxyTimeout = options.proxyTimeout;
	proxySettings.proxyEnabled = options.proxyEnabled;
	proxySettings.proxyUrl = options.proxyUrl;
}

// All fields are optional because shimInit fills in null defaults for each
export interface ShimInitOptions {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- sharp module type comes from the external library, not imported here
	sharp?: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- keytar module type comes from the external library
	keytar?: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- React module is assigned to shim.setReact which is `typeof React`; lib doesn't import React types
	React?: any;
	appVersion?: ()=> string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Electron bridge concrete type lives in app-desktop; see shim.electronBridge_
	electronBridge?: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- node sqlite driver shape is per-platform; see shim.nodeSqlite_
	nodeSqlite?: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- sqlite-vec is only bundled with desktop; see shim.sqliteVec_
	sqliteVec?: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- onnxruntime-node is only bundled with desktop; see shim.onnxRuntime_
	onnxRuntime?: any;
	pdfJs?: PdfJs;
	isAppleSilicon?: ()=> boolean;
}

function shimInit(options: ShimInitOptions = null) {
	options = {
		sharp: null,
		keytar: null,
		React: null,
		appVersion: null,
		electronBridge: null,
		nodeSqlite: null,
		sqliteVec: null,
		onnxRuntime: null,
		pdfJs: null,
		isAppleSilicon: () => false,
		...options,
	};

	const sharp = options.sharp;
	const keytar = (shim.isWindows() || shim.isMac()) && !shim.isPortable() ? options.keytar : null;
	const appVersion = options.appVersion;
	const pdfJs = options.pdfJs;

	shim.setNodeSqlite(options.nodeSqlite);
	shim.setSqliteVec(options.sqliteVec);
	shim.setOnnxRuntime(options.onnxRuntime);

	shim.fsDriver = () => {
		throw new Error('Not implemented');
	};
	shim.FileApiDriverLocal = FileApiDriverLocal;
	shim.Geolocation = GeolocationNode;
	shim.FormData = FormData as unknown as typeof shim.FormData;
	shim.sjclModule = require('./vendor/sjcl.js');
	shim.crypto = crypto;
	shim.electronBridge_ = options.electronBridge;

	shim.fsDriver = () => {
		if (!shim.fsDriver_) shim.fsDriver_ = new FsDriverNode();
		return shim.fsDriver_;
	};

	shim.sharpEnabled = () => {
		return !!sharp;
	};

	shim.dgram = () => {
		return dgram;
	};

	if (options.React) {
		shim.react = () => {
			return options.React;
		};
	}

	shim.electronBridge = () => {
		return shim.electronBridge_;
	};

	shim.randomBytes = async count => {
		const buffer = require('crypto').randomBytes(count);
		return Array.from(buffer);
	};

	shim.isAppleSilicon = () => {
		return options.isAppleSilicon ? options.isAppleSilicon() : false;
	};

	shim.platformArch = () => {
		const c = cpus();
		if (!c.length) return '';
		return c[0].model;
	};

	shim.detectAndSetLocale = function(Setting: typeof import('./models/Setting').default) {
		let locale = shim.isElectron() ? shim.electronBridge().getLocale() : process.env.LANG;
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

	shim.showMessageBox = async (message, options = null) => {
		if (shim.isElectron()) {
			return shim.electronBridge().showMessageBox(message, options ?? {});
		} else {
			throw new Error(`Not implemented: showMessageBox(${JSON.stringify(message)})`);
		}
	};

	const handleResizeImage_ = async function(filePath: string, targetPath: string, mime: string, resizeLargeImages: string) {
		const maxDim = Resource.IMAGE_MAX_DIMENSION;

		if (shim.isElectron()) {
			// For Electron/renderer process
			// Note that we avoid nativeImage because it loses rotation metadata.
			// See https://github.com/electron/electron/issues/41189
			//
			// After the upstream bug has been fixed, this should be reverted to using
			// nativeImage (see commit 99e8818ba093a931b1a0cbccbee0b94a4fd37a54 for the
			// original code).

			const image = new Image();
			image.src = pathToFileURL(filePath).href;
			await new Promise<void>((resolve, reject) => {
				image.onload = () => resolve();
				image.onerror = () => reject(new Error(`Image at ${filePath} failed to load.`));
				image.onabort = () => reject(new Error(`Loading stopped for image at ${filePath}.`));
			});
			if (!image.complete || (image.width === 0 && image.height === 0)) {
				throw new Error(`Image is invalid or does not exist: ${filePath}`);
			}

			const saveOriginalImage = async () => {
				await shim.fsDriver().copy(filePath, targetPath);
				return true;
			};
			const saveResizedImage = async () => {
				let newWidth, newHeight;
				if (image.width > image.height) {
					newWidth = maxDim;
					newHeight = image.height * maxDim / image.width;
				} else {
					newWidth = image.width * maxDim / image.height;
					newHeight = maxDim;
				}

				const canvas = new OffscreenCanvas(newWidth, newHeight);
				const ctx = canvas.getContext('2d');
				ctx.drawImage(image, 0, 0, newWidth, newHeight);

				const resizedImage = await canvas.convertToBlob({ type: mime });
				await fs.writeFile(targetPath, Buffer.from(await resizedImage.arrayBuffer()));
				return true;
			};

			const canResize = image.width > maxDim || image.height > maxDim;
			if (canResize) {
				if (resizeLargeImages === 'alwaysAsk') {
					const Yes = 0, No = 1, Cancel = 2;
					const userAnswer = await shim.showMessageBox(`${_('You are about to attach a large image (%dx%d pixels). Would you like to resize it down to %d pixels before attaching it?', image.width, image.height, maxDim)}\n\n${_('(You may disable this prompt in the options)')}`, {
						buttons: [_('Yes'), _('No'), _('Cancel')],
					});
					if (userAnswer === Yes) return await saveResizedImage();
					if (userAnswer === No) return await saveOriginalImage();
					if (userAnswer === Cancel) return false;
				} else if (resizeLargeImages === 'alwaysResize') {
					return await saveResizedImage();
				}
			}

			return await saveOriginalImage();
		} else {
			// For the CLI tool

			let md: Size = null;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- sharp() instance type comes from the external library; not imported in lib
			let image: any = null;

			if (sharp) {
				image = sharp(filePath);
				md = await image.metadata();
			}

			if (!md || (md.width <= maxDim && md.height <= maxDim)) {
				await shim.fsDriver().copy(filePath, targetPath);
				return true;
			}

			return new Promise((resolve, reject) => {
				image
					.resize(Resource.IMAGE_MAX_DIMENSION, Resource.IMAGE_MAX_DIMENSION, {
						fit: 'inside',
						withoutEnlargement: true,
					})
					.toFile(targetPath, (error: Error | null, info: unknown) => {
						if (error) {
							reject(error);
						} else {
							resolve(info);
						}
					});
			});
		}
	};

	// This is a bit of an ugly method that's used to both create a new resource
	// from a file, and update one. To update a resource, pass the
	// destinationResourceId option. This method is indirectly tested in
	// Api.test.ts.
	shim.createResourceFromPath = async function(filePath, defaultProps: ResourceEntity = null, options: CreateResourceFromPathOptions = null) {
		options = {
			resizeLargeImages: 'always', // 'always', 'ask' or 'never'
			userSideValidation: false,
			destinationResourceId: '',
			...options,
		};

		const isUpdate = !!options.destinationResourceId;

		if (!(await fs.pathExists(filePath))) throw new Error(_('Cannot access %s', filePath));

		defaultProps = defaultProps ? defaultProps : {};

		let resourceId = defaultProps.id ? defaultProps.id : BaseItem.generateUuid();
		if (isUpdate) resourceId = options.destinationResourceId;

		let resource = isUpdate ? {} : Resource.new();
		resource.id = resourceId;

		// When this is an update we auto-update the mime type, in case the
		// content type has changed, but we keep the title. It is still possible
		// to modify the title on update using defaultProps.
		resource.mime = mimeUtils.fromFilename(filePath);
		if (!isUpdate) resource.title = basename(filePath);

		let fileExt = safeFileExtension(fileExtension(filePath));

		if (!resource.mime) {
			const detectedType = await fileTypeFromFile(filePath);

			if (detectedType) {
				fileExt = fileExt ? fileExt : detectedType.ext;
				resource.mime = detectedType.mime;
			} else {
				resource.mime = 'application/octet-stream';
			}
		}

		resource.file_extension = fileExt;

		const targetPath = Resource.fullPath(resource);

		if (options.resizeLargeImages !== 'never' && ['image/jpeg', 'image/jpg', 'image/png'].includes(resource.mime)) {
			const ok = await handleResizeImage_(filePath, targetPath, resource.mime, options.resizeLargeImages);
			if (!ok) return null;
		} else {
			await fs.copy(filePath, targetPath, { overwrite: true });
		}

		// While a whole object can be passed as defaultProps, we only just
		// support the title and ID (used above). Any other prop should be
		// derived from the provided file.
		if ('title' in defaultProps) resource.title = defaultProps.title;

		const itDoes = await shim.fsDriver().waitTillExists(targetPath);
		if (!itDoes) throw new Error(`Resource file was not created: ${targetPath}`);

		const fileStat = await shim.fsDriver().stat(targetPath);
		resource.size = fileStat.size;

		const saveOptions: { isNew: boolean; userSideValidation?: boolean } = { isNew: true };
		if (options.userSideValidation) saveOptions.userSideValidation = true;

		if (isUpdate) {
			saveOptions.isNew = false;
			const tempPath = `${targetPath}.tmp`;
			await shim.fsDriver().move(targetPath, tempPath);
			resource = await Resource.save(resource, saveOptions);
			await Resource.updateResourceBlobContent(resource.id, tempPath);
			await shim.fsDriver().remove(tempPath);
			return resource;
		} else {
			return Resource.save(resource, saveOptions);
		}
	};

	shim.attachFileToNoteBody = async function(noteBody, filePath, position = null, options = null) {
		options = {
			createFileURL: false,
			markupLanguage: 1,
			resourcePrefix: '',
			resourceSuffix: '',
			...options,
		};

		const { basename } = require('path');
		const { escapeTitleText } = require('./markdownUtils').default;
		const { toFileProtocolPath } = require('./path-utils');

		let resource = null;
		if (!options.createFileURL) {
			resource = await shim.createResourceFromPath(filePath, null, options);
			if (!resource) return null;
		}

		const newBody = [];

		if (position === null) {
			position = noteBody ? noteBody.length : 0;
		}

		if (noteBody && position) newBody.push(noteBody.substr(0, position));

		if (!options.createFileURL) {
			newBody.push(options.resourcePrefix + Resource.markupTag(resource, options.markupLanguage) + options.resourceSuffix);
		} else {
			const filename = escapeTitleText(basename(filePath)); // to get same filename as standard drag and drop
			const fileURL = `[${filename}](${toFileProtocolPath(filePath)})`;
			newBody.push(options.resourcePrefix + fileURL + options.resourceSuffix);
		}

		if (noteBody) newBody.push(noteBody.substr(position));

		return newBody.join('');
	};

	shim.attachFileToNote = async function(note, filePath, options = {}) {
		if (!options) options = {};
		if (note.markup_language) options.markupLanguage = note.markup_language;
		const newBody = await shim.attachFileToNoteBody(note.body, filePath, options.position ?? 0, options);
		if (!newBody) return null;

		const newNote = { ...note, body: newBody };
		return Note.save(newNote);
	};

	shim.imageToDataUrl = async (filePath, maxSize) => {
		if (shim.isElectron()) {
			const nativeImage = require('electron').nativeImage;
			let image = nativeImage.createFromPath(filePath);
			if (!image) throw new Error(`Could not load image: ${filePath}`);

			const ext = fileExtension(filePath).toLowerCase();
			if (!['jpg', 'jpeg', 'png'].includes(ext)) throw new Error(`Unsupported file format: ${ext}`);

			if (maxSize) {
				const size = image.getSize();

				if (size.width > maxSize || size.height > maxSize) {
					console.warn(`Image is over ${maxSize}px - resizing it: ${filePath}`);

					const options: { width?: number; height?: number } = {};
					if (size.width > size.height) {
						options.width = maxSize;
					} else {
						options.height = maxSize;
					}

					image = image.resize(options);
				}
			}

			return image.toDataURL();
		} else if (shim.sharpEnabled()) {
			let image = sharp(filePath);
			const metadata = await image.metadata();

			const maxDimensionIsWidth = metadata.width > metadata.height;
			if (metadata.width > maxSize && maxDimensionIsWidth) {
				image = image.resize({ width: maxSize });
			} else if (metadata.height > maxSize) {
				image = image.resize({ height: maxSize });
			}

			const base64 = (await image.png().toBuffer()).toString('base64');
			return `data:image/png;base64,${base64}`;
		} else {
			throw new Error('Unsupported method');
		}
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

	// Not used??
	shim.readLocalFileBase64 = path => {
		const data = fs.readFileSync(path);
		return new Buffer(data).toString('base64');
	};

	shim.fetch = async function(url, options = {}) {
		try { // Check if the url is valid
			new URL(url);
		} catch (error) { // If the url is not valid, a TypeError will be thrown
			throw new Error(`Not a valid URL: ${url}`);
		}
		const agent = shim.httpAgent(url);
		return shim.fetchWithRetry(async () => {
			try {
				return await fetch(url, { ...options, dispatcher: agent });
			} catch (error) {
				// When error is a TypeError, information about the error failure is in
				// error.cause:
				const cause = error.cause;
				if (error instanceof TypeError && cause instanceof Error) {
					throw cause;
				}
				throw error;
			}
		}, options);
	};

	shim.fetchBlob = async function(url: string, options: FetchBlobOptions) {
		if (!options || !options.path) throw new Error('fetchBlob: target file path is missing');
		if (!options.method) options.method = 'GET';
		// if (!('maxRetry' in options)) options.maxRetry = 5;

		// 21 maxRedirects is the default amount from follow-redirects library
		// 20 seems to be the max amount that most popular browsers will allow
		if (!options.maxRedirects) options.maxRedirects = 21;
		if (!options.timeout) options.timeout = undefined;

		const method = options.method ? options.method : 'GET';
		const headers = options.headers ? options.headers : {};
		const filePath = options.path;
		const downloadController = options.downloadController;

		function makeResponse(response: Response) {
			return {
				ok: response.status < 400,
				path: filePath,
				text: () => {
					return response.statusText;
				},
				json: () => {
					return { message: `${response.status}: ${response.statusText}` };
				},
				status: response.status,
				headers: response.headers,
			};
		}

		const agent: Agent = shim.httpAgent(url, options);
		const dispatcher = agent.compose([
			interceptors.redirect({ maxRedirections: options.maxRedirects }),
			interceptors.decompress(),
		]);

		const doFetchOperation = async () => {
			const abortController = new AbortController();
			const requestOptions = new Request(url, {
				method: method,
				headers: new Headers(headers),
				dispatcher,
				signal: abortController.signal,
			});
			const response = await fetch(requestOptions);

			try {
				const notifyController = async function*(source: AsyncIterable<Buffer>) {
					let cancelWithError: Error|null = null;
					const chunkHandler = downloadController.handleChunk({
						destroy: (error) => {
							if (!cancelWithError) {
								cancelWithError = error ?? new Error('Cancelled');
								abortController.abort(error);
							}
						},
					});

					for await (const chunk of source) {
						chunkHandler(chunk);

						if (cancelWithError) throw cancelWithError;

						yield chunk;
					}
				};
				if (downloadController) {
					await pipeline(
						response.body,
						notifyController,
						fs.createWriteStream(filePath),
					);
				} else {
					await pipeline(
						response.body,
						fs.createWriteStream(filePath),
					);
				}
				return makeResponse(response);
			} catch (error) {
				await fs.unlink(filePath);
				throw error;
			}
		};

		return shim.fetchWithRetry(doFetchOperation, options);
	};

	shim.uploadBlob = async function(url, options) {
		if (!options || !options.path) throw new Error('uploadBlob: source file path is missing');
		const content = await fs.readFile(options.path);
		options = { ...options, body: content };
		return shim.fetch(url, options);
	};

	shim.stringByteLength = function(string) {
		return Buffer.byteLength(string, 'utf-8');
	};

	shim.openUrl = url => {
		// Returns true if it opens the file successfully; returns false if it could
		// not find the file.
		return shim.electronBridge().openExternal(url);
	};

	shim.httpAgent_ = null;

	// X25519MLKEM768 is a post-quantum cryptography key exchange, details:
	// https://developers.cloudflare.com/ssl/post-quantum-cryptography/
	// Not supported on by all SSL stacks and versions, detect support at runtime.
	let tlsEcdhCurve: string;
	try {
		tls.createSecureContext({ ecdhCurve: 'X25519MLKEM768:X25519:P-256:P-384' });
		tlsEcdhCurve = 'X25519MLKEM768:X25519:P-256:P-384';
	} catch {
		tlsEcdhCurve = 'auto';
	}

	interface ClientCertificatePair {
		privateKey: string;
		certificate: string;
		domains: string[];
	}
	let clientCertificates: ClientCertificatePair[] = [];

	shim.setClientCertificate = async (options) => {
		if (!options) {
			clientCertificates = [];
			return;
		}
		const { certPath, keyPath, keyPassword, domains } = options;
		if (!certPath || !keyPath) {
			throw new Error(`Missing ${!certPath ? 'certPath' : 'keyPath'}: Both certPath and keyPath must be provided.`);
		}

		const clientCert = await shim.fsDriver().readFile(certPath, 'utf-8');
		let clientKey = await shim.fsDriver().readFile(keyPath, 'utf-8');
		if (keyPassword) {
			const key = createPrivateKey({ key: clientKey, passphrase: keyPassword || undefined });
			clientKey = key.export({ format: 'pem', type: 'pkcs8' });
		}

		clientCertificates = [{ privateKey: clientKey, certificate: clientCert, domains }];
	};

	const agentSettingsBase = (url: string, options?: HttpAgentOptions) => {
		const parsedUrl = new URL(url);
		const clientCertPair = parsedUrl.protocol === 'https:' ? clientCertificates.find(pair => {
			return pair.domains.includes(parsedUrl.hostname);
		}) : null;

		return {
			headersTimeout: options?.timeout,
			bodyTimeout: options?.timeout,
			connectTimeout: options?.timeout,
			keepAliveTimeout: 5000,

			connect: {
				ecdhCurve: tlsEcdhCurve,
				...(clientCertPair ? {
					key: clientCertPair.privateKey,
					cert: clientCertPair.certificate,
				} : {}),
			},
		} satisfies Agent.Options;
	};

	shim.httpAgent = (url, options) => {
		const resolvedProxyUrl = resolveProxyUrl(proxySettings.proxyUrl);
		const lastSettings = shim.httpAgent_?.lastSettings;

		if (resolvedProxyUrl && proxySettings.proxyEnabled) {
			const baseSettings = agentSettingsBase(url, options);
			const { connect: proxyConnectSettings } = agentSettingsBase(resolvedProxyUrl, options);

			const agentSettings = {
				...baseSettings,
				requestTls: baseSettings.connect,
				proxyTls: proxyConnectSettings,
				connectTimeout: proxySettings.proxyTimeout * Second,

				connections: proxySettings.maxConcurrentConnections ?? null,
				uri: resolvedProxyUrl,
			} satisfies ProxyAgent.Options;
			delete agentSettings.connect;

			if (!fastDeepEqual(lastSettings, agentSettings)) {
				shim.httpAgent_ = {
					lastSettings: agentSettings,
					agent: new ProxyAgent(agentSettings),
				};
			}
		} else {
			const agentSettings = {
				...agentSettingsBase(url, options),
				maxSockets: 1,
			};
			if (!fastDeepEqual(lastSettings, agentSettings)) {
				shim.httpAgent_ = {
					lastSettings: agentSettings,
					agent: new Agent(agentSettings),
				};
			}
		}

		return shim.httpAgent_.agent;
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
		// Don't use openUrl() there.
		// The underneath require('electron').shell.openExternal() has a bug
		// https://github.com/electron/electron/issues/31347

		return shim.electronBridge().openItem(filepath);
	};

	shim.waitForFrame = () => {};

	shim.appVersion = () => {
		if (appVersion) return appVersion();
		// Should not happen but don't throw an error because version number is
		// used in error messages.
		return 'unknown';
	};

	shim.pathRelativeToCwd = (path) => {
		return toRelative(process.cwd(), path);
	};

	shim.setTimeout = (fn, interval) => {
		return timers.setTimeout(fn, interval);
	};

	shim.setInterval = (fn, interval) => {
		return timers.setInterval(fn, interval);
	};

	shim.clearTimeout = (id) => {
		return timers.clearTimeout(id);
	};

	shim.clearInterval = (id) => {
		return timers.clearInterval(id);
	};

	shim.keytar = () => {
		return keytar;
	};

	shim.requireDynamic = (path) => {
		if (path.indexOf('.') === 0) {
			const sites = callsites();
			if (sites.length <= 1) throw new Error(`Cannot require file (1) ${path}`);
			const filename = sites[1].getFileName();
			if (!filename) throw new Error(`Cannot require file (2) ${path}`);

			const fileDirName = require('path').dirname(filename);
			return require(`${fileDirName}/${path}`);
		} else {
			return require(path);
		}
	};

	const loadPdf = async (path: string) => {
		const loadingTask = pdfJs.getDocument({
			url: path,
			// https://github.com/mozilla/pdf.js/issues/4244#issuecomment-1479534301
			useSystemFonts: true,
			// IMPORTANT: Set to false to mitigate CVE-2024-4367.
			isEvalSupported: false,
		});
		return await loadingTask.promise;
	};

	shim.pdfExtractEmbeddedText = async (pdfPath: string): Promise<string[]> => {
		const doc = await loadPdf(pdfPath);
		const textByPage = [];

		try {
			for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
				const page = await doc.getPage(pageNum);
				const textContent = await page.getTextContent();

				const strings = textContent.items.map(item => {
					const text = item.str ?? '';
					return text;
				}).join('\n');

				// Some PDFs contain unsupported characters that can lead to hard-to-debug issues.
				// We remove them here.
				textByPage.push(replaceUnsupportedCharacters(strings));
			}
		} finally {
			await doc.destroy();
		}

		return textByPage;
	};

	shim.pdfToImagesWithDimensions = async (pdfPath: string, outputDirectoryPath: string, options?: CreatePdfFromImagesOptions): Promise<PdfPageImage[]> => {
		if (typeof HTMLCanvasElement === 'undefined') {
			throw new Error('Unsupported -- the Canvas element is required.');
		}

		const createCanvas = () => {
			return document.createElement('canvas');
		};

		const canvasToBuffer = async (canvas: HTMLCanvasElement): Promise<Buffer> => {
			const quality = 0.8;
			const canvasToBlob = async (canvas: HTMLCanvasElement): Promise<Blob> => {
				return new Promise(resolve => {
					canvas.toBlob(blob => resolve(blob), 'image/jpeg', quality);
				});
			};

			const blob = await canvasToBlob(canvas);
			return Buffer.from(await blob.arrayBuffer());
		};

		const filePrefix = `page_${Date.now()}`;
		const output: PdfPageImage[] = [];
		const doc = await loadPdf(pdfPath);

		try {
			const startPage = options?.minPage ?? 1;
			const endPage = Math.min(doc.numPages, options?.maxPage ?? doc.numPages);
			for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
				const page = await doc.getPage(pageNum);
				const viewport = page.getViewport({ scale: options?.scaleFactor ?? 2 });
				const canvas = createCanvas();
				const ctx = canvas.getContext('2d');
				if (!ctx) {
					throw new Error('Unable to get 2D rendering context from canvas.');
				}

				canvas.height = viewport.height;
				canvas.width = viewport.width;

				const renderTask = page.render({ canvasContext: ctx, viewport: viewport });
				await renderTask.promise;

				const buffer = await canvasToBuffer(canvas);
				const filePath = `${outputDirectoryPath}/${filePrefix}_${pageNum.toString().padStart(4, '0')}.jpg`;
				await writeFile(filePath, buffer, 'binary');
				if (!(await shim.fsDriver().exists(filePath))) throw new Error(`Could not write to file: ${filePath}`);

				output.push({
					path: filePath,
					width: viewport.width,
					height: viewport.height,
				});
			}
		} finally {
			await doc.destroy();
		}

		return output;
	};

	shim.pdfToImages = async (pdfPath: string, outputDirectoryPath: string, options?: CreatePdfFromImagesOptions): Promise<string[]> => {
		const pagesWithDimensions = await shim.pdfToImagesWithDimensions(pdfPath, outputDirectoryPath, options);
		return pagesWithDimensions.map(p => p.path);
	};

	shim.pdfInfo = async (pdfPath: string): Promise<PdfInfo> => {
		const doc = await loadPdf(pdfPath);
		return { pageCount: doc.numPages };
	};

	shim.createAccessiblePdf = async (originalPdfPath: string, ocrDetails: string, outputPath: string, tempDir: string): Promise<void> => {
		const workDir = `${tempDir}/accessible_pdf_${Date.now()}`;
		await shim.fsDriver().mkdir(workDir);

		try {
			// Convert PDF pages to images with dimensions
			const pageImages = await shim.pdfToImagesWithDimensions(originalPdfPath, workDir);

			// Read all images into buffers with their dimensions
			const pageImagesWithBuffers: { buffer: Buffer; width: number; height: number }[] = [];
			for (const pageImage of pageImages) {
				const buffer = await fs.readFile(pageImage.path);
				pageImagesWithBuffers.push({
					buffer,
					width: pageImage.width,
					height: pageImage.height,
				});
			}

			// Create the accessible PDF
			const pdfBytes = await createAccessiblePdf(pageImagesWithBuffers, ocrDetails);

			// Write the output file
			await writeFile(outputPath, pdfBytes);
		} finally {
			// Clean up work directory
			await shim.fsDriver().remove(workDir);
		}
	};
}

export { shimInit, setupProxySettings };
