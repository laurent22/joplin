import type ShimType from '@joplin/lib/shim';

const shim: typeof ShimType = require('@joplin/lib/shim').default;
import shimInitShared from './shimInitShared';
import FsDriverWeb from '../fs-driver/fs-driver-rn.web';
import { FetchBlobOptions } from '@joplin/lib/types';
import JoplinError from '@joplin/lib/JoplinError';
import joplinCrypto from '@joplin/lib/services/e2ee/crypto';

const shimInit = () => {
	type GetLocationOptions = { timeout?: number };
	shim.Geolocation = {
		currentPosition: ({ timeout = 10000 }: GetLocationOptions = {}) => {
			return new Promise((resolve, reject) => {
				navigator.geolocation?.getCurrentPosition((position) => {
					if (!position?.coords) {
						resolve(null);
					}

					resolve({
						timestamp: position.timestamp,
						// At least in Google Chrome, it seems necessary to read position.coords
						// within the .getCurrentPosition callback. Otherwise, if read later,
						// it can be undefined.
						coords: {
							latitude: position.coords.latitude,
							longitude: position.coords.longitude,
							altitude: position.coords.altitude,
						},
					});
				}, (error) => reject(error), { timeout });
			});
		},
	};

	let fsDriver_: FsDriverWeb|null = null;

	const fsDriver = () => {
		if (!fsDriver_) {
			fsDriver_ = new FsDriverWeb();
		}
		return fsDriver_;
	};
	shim.fsDriver = fsDriver;
	shim.crypto = joplinCrypto;

	shim.randomBytes = async (count: number) => {
		const buffer = new Uint8Array(count);
		crypto.getRandomValues(buffer);

		return [...buffer];
	};

	shim.fetchBlob = async function(url, options: FetchBlobOptions) {
		const outputPath = options.path;
		if (!outputPath) throw new Error('fetchBlob: Missing outputPath');

		const result = await fetch(url, { method: options.method, headers: options.headers });
		if (!result.ok) {
			throw new JoplinError(`fetch failed: ${result.statusText}`, result.status);
		}

		const blob = await result.blob();
		await fsDriver().writeFile(outputPath, await blob.arrayBuffer(), 'Buffer');

		return {
			ok: result.ok,
			path: outputPath,
			text: () => {
				return result.statusText;
			},
			json: () => {
				return { message: `${result.status}: ${result.statusText}` };
			},
			status: result.status,
			headers: result.headers,
		};
	};

	shim.uploadBlob = async function(url, options) {
		if (!options || !options.path) throw new Error('uploadBlob: source file path is missing');
		const content = await fsDriver().fileAtPath(options.path);
		return fetch(url, { ...options, body: content });
	};

	shim.readLocalFileBase64 = async function(path) {
		return shim.fsDriver().readFile(path, 'base64');
	};

	shim.httpAgent = () => {
		return null;
	};

	shim.waitForFrame = () => {
		return new Promise<void>((resolve) => {
			requestAnimationFrame(() => {
				resolve();
			});
		});
	};

	shim.appVersion = () => {
		return require('../../package.json').version;
	};

	shim.restartApp = () => {
		location.reload();
	};

	shimInitShared();
};

export default shimInit;
