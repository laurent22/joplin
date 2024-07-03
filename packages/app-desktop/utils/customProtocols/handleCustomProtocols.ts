import { net, protocol } from 'electron';
import { dirname, resolve, normalize, join } from 'path';
import { pathToFileURL } from 'url';
import { contentProtocolName } from './constants';
import resolvePathWithinDir from '@joplin/lib/utils/resolvePathWithinDir';
import { LoggerWrapper } from '@joplin/utils/Logger';
import * as fs from 'fs-extra';
import { createReadStream } from 'fs';
import { Readable } from 'stream';
import { fromFilename } from '@joplin/lib/mime-utils';

export interface CustomProtocolHandler {
	allowReadAccessToDirectory(path: string): void;
	allowReadAccessToFile(path: string): { remove(): void };
}

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
	const resultStream = Readable.toWeb(createReadStream(targetPath, { start: startByte, end: endByte }));

	// See the HTTP range requests guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests
	const headers = new Headers([
		['Accept-Ranges', 'bytes'],
		['Content-Type', fromFilename(targetPath)],
		['Content-Length', `${endByte + 1 - startByte}`],
		['Content-Range', `bytes ${startByte}-${endByte}/${stat.size}`],
	]);

	return new Response(
		// This cast is necessary -- .toWeb produces a different type
		// from the global ReadableStream.
		resultStream as ReadableStream,
		{ headers, status: 206 },
	);
};

// Creating a custom protocol allows us to isolate iframes by giving them
// different domain names from the main Joplin app.
//
// For example, an iframe with url joplin-content://note-viewer/path/to/iframe.html will run
// in a different process from a parent frame with url file://path/to/iframe.html.
//
// See note_viewer_isolation.md for why this is important.
//
// TODO: Use Logger.create (doesn't work for now because Logger is only initialized
// in the main process.)
const handleCustomProtocols = (logger: LoggerWrapper): CustomProtocolHandler => {
	const readableDirectories: string[] = [];
	const readableFiles = new Set<string>();

	// See also the protocol.handle example: https://www.electronjs.org/docs/latest/api/protocol#protocolhandlescheme-handler
	protocol.handle(contentProtocolName, async request => {
		const url = new URL(request.url);
		const host = url.host;

		let pathname = normalize(url.pathname);

		// On Windows, pathname can be normalized to
		//   \C:\path\name\here
		// (with an extra slash at the beginning).
		if (pathname.startsWith('\\')) {
			pathname = pathname.substring(1);
		}

		// See https://security.stackexchange.com/a/123723
		if (pathname.startsWith('..')) {
			throw new Error(`Invalid URL (not absolute), ${request.url}`);
		}

		const allowedHosts = ['note-viewer'];

		// Path from which `pathname` should be resolved
		let rootDirectory = null;

		if (allowedHosts.includes(host)) {
			if (readableFiles.has(pathname)) {
				rootDirectory = '';
			} else {
				for (const readableDirectory of readableDirectories) {
					if (resolvePathWithinDir(readableDirectory, pathname)) {
						rootDirectory = '';
						break;
					}
				}
			}
		} else {
			throw new Error(`Invalid URL ${request.url}`);
		}

		if (rootDirectory === null) {
			throw new Error(`Read access not granted for URL ${request.url}`);
		}

		const targetFile = join(rootDirectory, pathname);

		const asFileUrl = pathToFileURL(targetFile).toString();
		logger.debug('protocol handler: Fetch file URL', asFileUrl);

		const rangeHeader = request.headers.get('Range');
		if (!rangeHeader) {
			const response = await net.fetch(asFileUrl);
			return response;
		} else {
			return handleRangeRequest(request, targetFile);
		}
	});

	const appBundleDirectory = dirname(dirname(__dirname));
	return {
		allowReadAccessToDirectory: (path: string) => {
			const allowedPath = resolve(appBundleDirectory, path);
			logger.info('protocol handler: Allow read access to directory', allowedPath);

			readableDirectories.push(allowedPath);
		},
		allowReadAccessToFile: (path: string) => {
			const allowedPath = resolve(appBundleDirectory, path);
			logger.debug('protocol handler: Allow read access to file', allowedPath);
			readableFiles.add(path);

			return {
				remove: () => {
					logger.debug('protocol handler: Remove read access to file', allowedPath);
					readableFiles.delete(path);
				},
			};
		},
	};
};

export default handleCustomProtocols;
