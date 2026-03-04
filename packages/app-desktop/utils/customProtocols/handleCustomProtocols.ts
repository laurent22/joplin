import { net, protocol } from 'electron';
import { dirname, resolve, normalize } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { contentProtocolName, pluginProtocolName } from './constants';
import resolvePathWithinDir from '@joplin/lib/utils/resolvePathWithinDir';
import * as fs from 'fs-extra';
import { createReadStream } from 'fs';
import { fromFilename } from '@joplin/lib/mime-utils';
import { createSecureRandom } from '@joplin/lib/uuid';

export interface AccessController {
	remove(): void;
}

export interface CustomContentProtocolHandler {
	// note-viewer/ URLs
	allowReadAccessToDirectory(path: string): void;
	allowReadAccessToFile(path: string): AccessController;
	allowReadAccessToFiles(paths: string[]): AccessController;

	// file-media/ URLs
	setMediaAccessEnabled(enabled: boolean): void;
	getMediaAccessKey(): string;
}

export interface ContentScriptRegistration {
	uri: string;
	revoke: ()=> void;
}

export interface CustomPluginProtocolHandler {
	registerContentScript(id: string, js: string): ContentScriptRegistration;
}

export interface CustomProtocolHandlers {
	appContent: CustomContentProtocolHandler;
	pluginContent: CustomPluginProtocolHandler;
}


// In some cases, the NodeJS built-in adapter (Readable.toWeb) closes its controller twice,
// leading to an error dialog. See:
// - https://github.com/nodejs/node/blob/e578c0b1e8d3dd817e692a0c5df1b97580bc7c7f/lib/internal/webstreams/adapters.js#L454
// - https://github.com/nodejs/node/issues/54205
// We work around this by creating a more-error-tolerant custom adapter.
const nodeStreamToWeb = (resultStream: fs.ReadStream) => {
	resultStream.pause();

	let closed = false;

	return new ReadableStream({
		start: (controller) => {
			resultStream.on('data', (chunk) => {
				if (closed) {
					return;
				}

				if (Buffer.isBuffer(chunk)) {
					controller.enqueue(new Uint8Array(chunk));
				} else {
					controller.enqueue(chunk);
				}

				if (controller.desiredSize <= 0) {
					resultStream.pause();
				}
			});

			resultStream.on('error', (error) => {
				controller.error(error);
			});

			resultStream.on('end', () => {
				if (!closed) {
					closed = true;
					controller.close();
				}
			});
		},
		pull: (_controller) => {
			if (closed) {
				return;
			}

			resultStream.resume();
		},
		cancel: () => {
			if (!closed) {
				closed = true;
				resultStream.close();
			}
		},
	}, { highWaterMark: resultStream.readableHighWaterMark });
};

// Allows seeking videos.
// See https://github.com/electron/electron/issues/38749 for why this is necessary.
const handleRangeRequest = async (request: Request, targetPath: string) => {
	const makeUnsupportedRangeResponse = () => {
		return new Response('unsupported range', {
			status: 416, // Range Not Satisfiable
		});
	};

	const rangeHeader = request.headers.get('Range');
	if (!rangeHeader.startsWith('bytes=')) {
		return makeUnsupportedRangeResponse();
	}

	const stat = await fs.stat(targetPath);
	// Ranges are requested using one of the following formats
	//  bytes=1234-5679
	//  bytes=-5678
	//  bytes=1234-
	// See https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Range
	const startByte = Number(rangeHeader.match(/(\d+)-/)?.[1] || '0');
	const endByte = Number(rangeHeader.match(/-(\d+)/)?.[1] || `${stat.size - 1}`);

	if (endByte > stat.size || startByte < 0) {
		return makeUnsupportedRangeResponse();
	}

	// Note: end is inclusive.
	const resultStream = createReadStream(targetPath, { start: startByte, end: endByte });

	// See the HTTP range requests guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests
	const headers = new Headers([
		['Accept-Ranges', 'bytes'],
		['Content-Type', fromFilename(targetPath)],
		['Content-Length', `${endByte + 1 - startByte}`],
		['Content-Range', `bytes ${startByte}-${endByte}/${stat.size}`],
	]);


	return new Response(
		nodeStreamToWeb(resultStream),
		{ headers, status: 206 },
	);
};

const makeAccessDeniedResponse = (message: string) => {
	return new Response(message, {
		status: 403, // Forbidden
	});
};

const makeNotFoundResponse = () => {
	return new Response('not found', {
		status: 404,
	});
};

type LoggerSlice = {
	debug: (...message: unknown[])=> void;
};

const handleContentProtocol = (logger: LoggerSlice) => {
	// Allow-listed files/directories for joplin-content://note-viewer/
	const readableDirectories: string[] = [];
	const readableFiles = new Map<string, number>();
	// Access for joplin-content://file-media/
	let mediaAccessKey: string|false = false;

	const appBundleDirectory = dirname(dirname(__dirname));

	// Serves main app content (e.g. the note viewer)
	protocol.handle(contentProtocolName, async request => {
		const url = new URL(request.url);
		const host = url.host;

		let pathname = normalize(fileURLToPath(`file://${url.pathname}`));

		// See https://security.stackexchange.com/a/123723
		if (pathname.startsWith('..')) {
			return new Response('Invalid URL (not absolute)', {
				status: 400,
			});
		}

		pathname = resolve(appBundleDirectory, pathname);

		let canRead = false;
		let mediaOnly = true;
		if (host === 'note-viewer' || host === 'plugin-webview') {
			if (readableFiles.has(pathname)) {
				canRead = true;
			} else {
				for (const readableDirectory of readableDirectories) {
					if (resolvePathWithinDir(readableDirectory, pathname)) {
						canRead = true;
						break;
					}
				}
			}

			mediaOnly = false;
		} else if (host === 'file-media') {
			if (!mediaAccessKey) {
				return makeAccessDeniedResponse('Media access denied. This must be enabled with .setMediaAccessEnabled');
			}

			canRead = true;
			mediaOnly = true;

			const accessKey = url.searchParams.get('access-key');
			if (accessKey !== mediaAccessKey) {
				return makeAccessDeniedResponse('Invalid or missing media access key. An allow-listed ?access-key= parameter must be provided.');
			}
		} else {
			return new Response(`Invalid request URL (${request.url})`, {
				status: 400,
			});
		}

		if (!canRead) {
			return makeAccessDeniedResponse(`Read access not granted for URL (${request.url})`);
		}

		const asFileUrl = pathToFileURL(pathname).toString();
		logger.debug('protocol handler: Fetch file URL', asFileUrl);

		const rangeHeader = request.headers.get('Range');
		let response;
		try {
			if (!rangeHeader) {
				response = await net.fetch(asFileUrl);
			} else {
				response = await handleRangeRequest(request, pathname);
			}
		} catch (error) {
			if (
				// Errors from NodeJS fs methods (e.g. fs.stat()
				error.code === 'ENOENT'
				// Errors from Electron's net.fetch(). Use error.message since these errors don't
				// seem to have a specific .code or .name.
				|| error.message === 'net::ERR_FILE_NOT_FOUND'
			) {
				response = makeNotFoundResponse();
			} else {
				throw error;
			}
		}

		if (mediaOnly) {
			// Tells the browser to avoid MIME confusion attacks. See
			// https://blog.mozilla.org/security/2016/08/26/mitigating-mime-confusion-attacks-in-firefox/
			response.headers.set('X-Content-Type-Options', 'nosniff');

			// This is an extra check to prevent loading text/html and arbitrary non-media content from the URL.
			const contentType = response.headers.get('Content-Type');
			if (!contentType || !contentType.match(/^(image|video|audio)\//)) {
				return makeAccessDeniedResponse(`Attempted to access non-media file from ${request.url}, which is media-only. Content type was ${contentType}.`);
			}
		}

		return response;
	});

	const result: CustomContentProtocolHandler = {
		allowReadAccessToDirectory: (path: string) => {
			path = resolve(appBundleDirectory, path);
			logger.debug('protocol handler: Allow read access to directory', path);

			readableDirectories.push(path);
		},
		allowReadAccessToFile: (path: string) => {
			path = resolve(appBundleDirectory, path);
			logger.debug('protocol handler: Allow read access to file', path);

			if (readableFiles.has(path)) {
				readableFiles.set(path, readableFiles.get(path) + 1);
			} else {
				readableFiles.set(path, 1);
			}

			return {
				remove: () => {
					if ((readableFiles.get(path) ?? 0) <= 1) {
						logger.debug('protocol handler: Remove read access to file', path);
						readableFiles.delete(path);
					} else {
						readableFiles.set(path, readableFiles.get(path) - 1);
					}
				},
			};
		},
		allowReadAccessToFiles: (paths: string[]) => {
			const handles = paths.map(path => {
				return result.allowReadAccessToFile(path);
			});
			return {
				remove: () => {
					for (const handle of handles) {
						handle.remove();
					}
				},
			};
		},
		setMediaAccessEnabled: (enabled: boolean) => {
			if (enabled) {
				mediaAccessKey ||= createSecureRandom();
			} else {
				mediaAccessKey = false;
			}
		},
		// Allows access to all local media files, provided a matching ?access-key=<key> is added
		// to the request URL.
		getMediaAccessKey: () => {
			return mediaAccessKey || null;
		},
	};
	return result;
};

const handlePluginProtocol = (logger: LoggerSlice) => {
	const hostedContentScriptJs = new Map<string, string>(); // Maps from content script IDs to content script data
	protocol.handle(pluginProtocolName, async request => {
		const url = new URL(request.url);
		const host = url.host;

		if (host !== 'plugins') {
			return new Response('Unknown hostname', { status: 400 });
		}

		if (request.method !== 'GET') {
			return new Response('Unsupported request method', { status: 405 });
		}

		const contentScriptPath = '/content-script/';
		if (url.pathname.startsWith(contentScriptPath)) {
			const contentScriptId = url.pathname.substring(contentScriptPath.length);
			logger.debug('Request for content script with ID', contentScriptId);

			const js = hostedContentScriptJs.get(contentScriptId);
			if (!js) {
				return new Response('Content script not found', { status: 404 });
			}

			return new Response(js, {
				headers: [
					['Content-Type', 'application/javascript'],
				],
			});
		} else {
			return new Response('Path not found', { status: 404 });
		}
	});

	const handler: CustomPluginProtocolHandler = {
		// Hosts a content script with the given `js` using the plugin protocol.
		// This can be used to allow loading trusted plugin JavaScript without relying on eval,
		// inline scripts, or other techniques that would violate the application's
		// Content-Security-Policy.
		//
		// Caution: This assumes that `js` is provided by a trusted source. Be careful
		// when building/providing `js` to this function.
		registerContentScript: (id: string, js: string) => {
			id = encodeURIComponent(id);
			logger.debug('Registering content script with ID', id);

			hostedContentScriptJs.set(id, js);

			return {
				uri: `${pluginProtocolName}://plugins/content-script/${id}`,
				revoke: () => {
					hostedContentScriptJs.delete(id);
				},
			};
		},
	};
	return handler;
};

// Creating a custom protocol allows us to isolate iframes by giving them
// different domain names from the main Joplin app.
//
// For example, an iframe with url joplin-content://note-viewer/path/to/iframe.html will run
// in a different process from a parent frame with url file://path/to/iframe.html.
//
// See note_viewer_isolation.md for why this is important.
//
// See also the protocol.handle example: https://www.electronjs.org/docs/latest/api/protocol#protocolhandlescheme-handler
//
const handleCustomProtocols = (): CustomProtocolHandlers => {
	const logger = {
		// Disabled for now
		debug: (..._message: unknown[]) => {},
	};

	const appContent = handleContentProtocol(logger);
	const pluginContent = handlePluginProtocol(logger);
	return { appContent, pluginContent };
};

export default handleCustomProtocols;
