import * as React from 'react';
import { NoteEntity, ResourceEntity } from './services/database/types';
import type FsDriverBase from './fs-driver-base';
import type FileApiDriverLocal from './file-api-driver-local';

export interface CreateResourceFromPathOptions {
	resizeLargeImages?: 'always' | 'never' | 'ask';
	userSideValidation?: boolean;
	destinationResourceId?: string;
}

export interface CreatePdfFromImagesOptions {
	minPage?: number;
	maxPage?: number;
	scaleFactor?: number;
}

export interface PdfInfo {
	pageCount: number;
}

let isTestingEnv_ = false;

// We need to ensure that there's only one instance of React being used by all
// the packages. In particular, the lib might need React to define generic
// hooks, but it shouldn't have React in its dependencies as that would cause
// the following error:
//
// https://reactjs.org/warnings/invalid-hook-call-warning.html#duplicate-react
//
// So instead, the **applications** include React as a dependency, then pass it
// to any other packages using the shim. Essentially, only one package should
// require React, and in our case that should be one of the applications
// (app-desktop, app-mobile, etc.) since we are sure they won't be dependency to
// other packages (unlike the lib which can be included anywhere).
//
// Regarding the type - although we import React, we only use it as a type
// using `typeof React`. This is just to get types in hooks.
//
// https://stackoverflow.com/a/42816077/561309
let react_: typeof React = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
let nodeSqlite_: any = null;

const shim = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	Geolocation: null as any,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	electronBridge_: null as any,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	fsDriver_: null as any,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	httpAgent_: null as any,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	proxyAgent: null as any,

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	electronBridge: (): any => {
		throw new Error('Not implemented: electronBridge');
	},

	msleep_: (ms: number) => {
		// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
		return new Promise((resolve: Function) => {
			shim.setTimeout(() => {
				resolve(null);
			}, ms);
		});
	},

	isNode: () => {
		if (typeof process === 'undefined') return false;
		if (shim.isElectron()) return true;
		return !shim.mobilePlatform();
	},

	isReactNative: () => {
		if (typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('ReactNativeDebugger') >= 0) {
			return true;
		}

		return !shim.isNode();
	},

	isLinux: () => {
		return process && process.platform === 'linux';
	},

	isGNOME: () => {
		if ((!shim.isLinux() && !shim.isFreeBSD()) || !process) {
			return false;
		}

		const currentDesktop = process.env['XDG_CURRENT_DESKTOP'] ?? '';

		// XDG_CURRENT_DESKTOP may be something like "ubuntu:GNOME" and not just "GNOME".
		// Thus, we use .includes and not ===.
		if (currentDesktop.includes('GNOME')) {
			return true;
		}

		// On Ubuntu, "XDG_CURRENT_DESKTOP=ubuntu:GNOME" is replaced with "Unity" and
		// ORIGINAL_XDG_CURRENT_DESKTOP stores the original desktop.
		const originalCurrentDesktop = process.env['ORIGINAL_XDG_CURRENT_DESKTOP'] ?? '';
		if (originalCurrentDesktop.includes('GNOME')) {
			return true;
		}

		return false;
	},

	isFreeBSD: () => {
		return process && process.platform === 'freebsd';
	},

	isWindows: () => {
		return process && process.platform === 'win32';
	},

	isMac: () => {
		return process && process.platform === 'darwin';
	},

	platformName: () => {
		if (shim.isReactNative()) return shim.mobilePlatform();
		if (shim.isMac()) return 'darwin';
		if (shim.isWindows()) return 'win32';
		if (shim.isLinux()) return 'linux';
		if (shim.isFreeBSD()) return 'freebsd';
		if (process && process.platform) return process.platform;
		throw new Error('Cannot determine platform');
	},

	// "ios" or "android", or "" if not on mobile
	mobilePlatform: () => {
		return ''; // Default if we're not on mobile (React Native)
	},

	// https://github.com/cheton/is-electron
	isElectron: () => {
		// Renderer process
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		if (typeof window !== 'undefined' && typeof window.process === 'object' && (window.process as any).type === 'renderer') {
			return true;
		}

		// Main process
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		if (typeof process !== 'undefined' && typeof process.versions === 'object' && !!(process.versions as any).electron) {
			return true;
		}

		// Detect the user agent when the `nodeIntegration` option is set to true
		if (typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('Electron') >= 0) {
			return true;
		}

		return false;
	},

	isPortable: (): boolean => {
		return typeof process !== 'undefined' && typeof process.env === 'object' && !!process.env.PORTABLE_EXECUTABLE_DIR;
	},

	// Node requests can go wrong is so many different ways and with so
	// many different error messages... This handler inspects the error
	// and decides whether the request can safely be repeated or not.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	fetchRequestCanBeRetried: (error: any) => {
		if (!error) return false;

		// Unfortunately the error 'Network request failed' doesn't have a type
		// or error code, so hopefully that message won't change and is not localized
		if (error.message === 'Network request failed') return true;

		// request to https://public-ch3302....1fab24cb1bd5f.md failed, reason: socket hang up"
		if (error.code === 'ECONNRESET') return true;

		// OneDrive (or Node?) sometimes sends back a "not found" error for resources
		// that definitely exist and in this case repeating the request works.
		// Error is:
		// request to https://graph.microsoft.com/v1.0/drive/special/approot failed, reason: getaddrinfo ENOTFOUND graph.microsoft.com graph.microsoft.com:443
		//
		// 2024-04-07: Strictly speaking we shouldn't repeat the request if the resource doesn't
		// exist. Hopefully OneDrive has now fixed this issue and the hack is no longer necessary.
		//
		// (error.code === 'ENOTFOUND') return true;

		// network timeout at: https://public-ch3302...859f9b0e3ab.md
		if (error.message && error.message.indexOf('network timeout') === 0) return true;

		// name: 'FetchError',
		// message: 'request to https://api.ipify.org/?format=json failed, reason: getaddrinfo EAI_AGAIN api.ipify.org:443',
		// type: 'system',
		// errno: 'EAI_AGAIN',
		// code: 'EAI_AGAIN' } } reason: { FetchError: request to https://api.ipify.org/?format=json failed, reason: getaddrinfo EAI_AGAIN api.ipify.org:443
		//
		// It's a Microsoft error: "A temporary failure in name resolution occurred."
		if (error.code === 'EAI_AGAIN') return true;

		// request to https://public-...8fd8bc6bb68e9c4d17a.md failed, reason: connect ETIMEDOUT 204.79.197.213:443
		// Code: ETIMEDOUT
		if (error.code === 'ETIMEDOUT') return true;

		// ECONNREFUSED is generally temporary
		if (error.code === 'ECONNREFUSED') return true;

		return false;
	},

	fetchMaxRetry_: 5,

	fetchMaxRetrySet: (v: number) => {
		const previous = shim.fetchMaxRetry_;
		shim.fetchMaxRetry_ = v;
		return previous;
	},

	// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any -- Old code before rule was applied, Old code before rule was applied
	fetchWithRetry: async function(fetchFn: Function, options: any = null) {
		if (!options) options = {};
		if (!options.timeout) options.timeout = 1000 * 120; // ms
		if (!('maxRetry' in options)) options.maxRetry = shim.fetchMaxRetry_;

		let retryCount = 0;
		while (true) {
			try {
				const response = await fetchFn();
				return response;
			} catch (error) {
				if (shim.fetchRequestCanBeRetried(error)) {
					retryCount++;
					if (retryCount > options.maxRetry) throw error;
					await shim.msleep_(retryCount * 3000);
				} else {
					throw error;
				}
			}
		}
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	fetch: (_url: string, _options: any = null): any => {
		throw new Error('Not implemented: fetch');
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	fetchText: async (url: string, options: any = null): Promise<string> => {
		const r = await shim.fetch(url, options || {});
		if (!r.ok) throw new Error(`Could not fetch ${url}`);
		return r.text();
	},

	createResourceFromPath: async (_filePath: string, _defaultProps: ResourceEntity = null, _options: CreateResourceFromPathOptions = null): Promise<ResourceEntity> => {
		throw new Error('Not implemented: createResourceFromPath');
	},

	FormData: typeof FormData !== 'undefined' ? FormData : null,

	fsDriver: (): FsDriverBase => {
		throw new Error('Not implemented: fsDriver');
	},

	FileApiDriverLocal: null as typeof FileApiDriverLocal,

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	readLocalFileBase64: (_path: string): any => {
		throw new Error('Not implemented: readLocalFileBase64');
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	uploadBlob: (_url: string, _options: any): any => {
		throw new Error('Not implemented: uploadBlob');
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	sjclModule: null as any,

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	randomBytes: async (_count: number): Promise<any> => {
		throw new Error('Not implemented: randomBytes');
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	stringByteLength: (_s: string): any => {
		throw new Error('Not implemented: stringByteLength');
	},

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	detectAndSetLocale: null as Function,

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	attachFileToNote: async (_note: any, _filePath: string): Promise<NoteEntity> => {
		throw new Error('Not implemented: attachFileToNote');
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	attachFileToNoteBody: async (_body: string, _filePath: string, _position: number, _options: any): Promise<string> => {
		throw new Error('Not implemented: attachFileToNoteBody');
	},

	imageToDataUrl: async (_filePath: string, _maxSize = 0): Promise<string> => {
		throw new Error('Not implemented: imageToDataUrl');
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	imageFromDataUrl: async (_imageDataUrl: string, _filePath: string, _options: any = null): Promise<any> => {
		throw new Error('Not implemented: imageFromDataUrl');
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	fetchBlob: function(_url: string, _options: any = null): any {
		throw new Error('Not implemented: fetchBlob');
	},

	// Does not do OCR -- just extracts existing text from a PDF.
	pdfExtractEmbeddedText: async (_pdfPath: string): Promise<string[]> => {
		throw new Error('Not implemented: textFromPdf');
	},

	pdfToImages: async (_pdfPath: string, _outputDirectoryPath: string, _options?: CreatePdfFromImagesOptions): Promise<string[]> => {
		throw new Error('Not implemented: pdfToImages');
	},

	pdfInfo: async (_pdfPath: string): Promise<PdfInfo> => {
		throw new Error('Not implemented: pdfInfo');
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	Buffer: null as any,

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	openUrl: (_url: string): any => {
		throw new Error('Not implemented: openUrl');
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	httpAgent: (_url: string): any => {
		throw new Error('Not implemented: httpAgent');
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	openOrCreateFile: (_path: string, _defaultContents: any): any => {
		throw new Error('Not implemented: openOrCreateFile');
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	waitForFrame: (): any => {
		throw new Error('Not implemented: waitForFrame');
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	appVersion: (): any => {
		throw new Error('Not implemented: appVersion');
	},

	injectedJs: (_name: string) => '',

	isTestingEnv: () => {
		return isTestingEnv_;
	},

	setIsTestingEnv: (v: boolean) => {
		isTestingEnv_ = v;
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	pathRelativeToCwd: (_path: string): any => {
		throw new Error('Not implemented');
	},

	// Returns the index of the button that was clicked. By default,
	// 0 -> OK
	// 1 -> Cancel
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	showMessageBox: (_message: string, _options: any = null): Promise<number> => {
		throw new Error('Not implemented');
	},

	showConfirmationDialog: async (message: string): Promise<boolean> => {
		return await shim.showMessageBox(message) === 0;
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	writeImageToFile: (_image: any, _format: any, _filePath: string): void => {
		throw new Error('Not implemented');
	},

	// setTimeout/setInterval are in the shim so that in Electron renderer process
	// we can force the use of the Node timers from the "timers" package. This is to go around
	// a bug that happened while testing plugins (on WSL2 / X-Server, so same as Linux):
	//
	// - The plugin would change some text in the editor
	// - The editor would schedule a save using setTimeout (via AsyncActionQueue)
	// - The timer would never get fired (although setTimeout was definitely called)
	//
	// It's not clear whether it is due to the code path originating in the plugin script or
	// some other bugs. But in any case, the issue was fixed using require('timers').setTimeout
	// instead of the default window.setTimeout. Might be related to this Electron bug:
	// https://github.com/electron/electron/issues/25311
	// (although changing allowRendererProcessReuse solved nothing)
	//
	// These unreliable timers might also be the reason for hard to replicate bugs in file watching
	// or the synchronisation freeze bug on Linux.
	//
	// Having the timers wrapped in that way would also make it easier to debug timing issue and
	// find out what timers have been fired or not.
	// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any -- Old code before rule was applied, Old code before rule was applied
	setTimeout: (_fn: Function, _interval: number): any=> {
		throw new Error('Not implemented');
	},

	// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any -- Old code before rule was applied, Old code before rule was applied
	setInterval: (_fn: Function, _interval: number): any=> {
		throw new Error('Not implemented');
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	clearTimeout: (_id: any): any => {
		throw new Error('Not implemented');
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	clearInterval: (_id: any): any => {
		throw new Error('Not implemented');
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	setNodeSqlite: (nodeSqlite: any) => {
		nodeSqlite_ = nodeSqlite;
	},

	nodeSqlite: () => {
		if (!nodeSqlite_) throw new Error('Trying to access nodeSqlite before it has been set!!!');
		return nodeSqlite_;
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	setReact: (react: any) => {
		react_ = react;
	},

	react: () => {
		if (!react_) throw new Error('Trying to access React before it has been set!!!');
		return react_;
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	dgram: (): any => {
		throw new Error('Not implemented');
	},

	platformSupportsKeyChain: () => {
		// keytar throws an error when system keychain is not present; even
		// when keytar itself is installed. try/catch to ensure system
		// keychain is present and no error is thrown.

		// For now, keychain support is disabled on Linux because when
		// keytar is loaded it seems to cause the following error when
		// loading Sharp:
		//
		// Something went wrong installing the "sharp" module
		// /lib/x86_64-linux-gnu/libz.so.1: version `ZLIB_1.2.9' not found
		// (required by
		// /home/travis/build/laurent22/joplin/packages/app-cli/node_modules/sharp/build/Release/../../vendor/lib/libpng16.so.16)
		//
		// See: https://travis-ci.org/github/laurent22/joplin/jobs/686222036
		//
		// Also disabled in portable mode obviously.

		return (shim.isWindows() || shim.isMac()) && !shim.isPortable();
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	keytar: (): any => {
		throw new Error('Not implemented');
	},

	// In general all imports should be static, but for cases where dynamic
	// require is needed, we should use the shim so that the code can build in
	// React Native. In React Native that code path will throw an error, but at
	// least it will build.
	// https://stackoverflow.com/questions/55581073
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	requireDynamic: (_path: string): any => {
		throw new Error('Not implemented');
	},

};

export default shim;
