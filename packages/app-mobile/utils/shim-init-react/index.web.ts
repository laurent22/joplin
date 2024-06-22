import type ShimType from '@joplin/lib/shim';

const shim: typeof ShimType = require('@joplin/lib/shim').default;
import { generateSecureRandom } from 'react-native-securerandom';
import { getLocales } from 'react-native-localize';
import { setLocale, defaultLocale, closestSupportedLocale } from '@joplin/lib/locale';
import Setting from '@joplin/lib/models/Setting';
import shimInitShared from './shimInitShared';
import FsDriverWeb from '../fs-driver/fs-driver-rn.web';
import { FetchBlobOptions } from '@joplin/lib/types';
import JoplinError from '@joplin/lib/JoplinError';

const shimInit = () => {
	let fsDriver_: FsDriverWeb|null = null;

	const fsDriver = () => {
		if (!fsDriver_) {
			fsDriver_ = new FsDriverWeb();
		}
		return fsDriver_;
	};
	shim.fsDriver = fsDriver;

	shim.randomBytes = async (count: number) => {
		const randomBytes = await generateSecureRandom(count);
		const temp = [];
		for (const n in randomBytes) {
			if (!randomBytes.hasOwnProperty(n)) continue;
			temp.push(randomBytes[n]);
		}
		return temp;
	};

	/* eslint-enable */

	shim.detectAndSetLocale = (settings: typeof Setting) => {
		// [
		// 	{
		// 		"countryCode": "US",
		// 		"isRTL": false,
		// 		"languageCode": "fr",
		// 		"languageTag": "fr-US"
		// 	},
		// 	{
		// 		"countryCode": "US",
		// 		"isRTL": false,
		// 		"languageCode": "en",
		// 		"languageTag": "en-US"
		// 	}
		// ]

		const locales = getLocales();
		let locale = locales.length ? locales[0].languageTag : defaultLocale();
		locale = closestSupportedLocale(locale);
		settings.setValue('locale', locale);
		setLocale(locale);
		return locale;
	};

	shim.fetch = async function(url, options = null) {
		// The native fetch() throws an uncatchable error that crashes the
		// app if calling it with an invalid URL such as '//.resource' or
		// "http://ocloud. de" so detect if the URL is valid beforehand and
		// throw a catchable error. Bug:
		// https://github.com/facebook/react-native/issues/7436
		let validatedUrl = '';
		try { // Check if the url is valid
			validatedUrl = new URL(url).href;
		} catch (error) { // If the url is not valid, a TypeError will be thrown
			throw new Error(`Not a valid URL: ${url}`);
		}

		return shim.fetchWithRetry(() => {
			// If the request has a body and it's not a GET call, and it
			// doesn't have a Content-Type header we display a warning,
			// because it could trigger a "Network request failed" error.
			// https://github.com/facebook/react-native/issues/30176
			if (options?.body && options?.method && options.method !== 'GET' && !options?.headers?.['Content-Type']) {
				console.warn('Done a non-GET fetch call without a Content-Type header. It may make the request fail.', url, options);
			}

			// Among React Native `fetch()` many bugs, one of them is that
			// it will truncate strings when they contain binary data.
			// Browser fetch() or Node fetch() work fine but as always RN's
			// one doesn't. There's no obvious way to fix this so we'll
			// have to wait if it's eventually fixed upstream. See here for
			// more info:
			// https://github.com/laurent22/joplin/issues/3986#issuecomment-718019688

			return fetch(validatedUrl, options);
		}, options);
	};

	shim.fetchBlob = async function(url, options: FetchBlobOptions) {
		const outputPath = options.path;
		if (!outputPath) throw new Error('fetchBlob: Missing outputPath');

		const result = await fetch(url, { method: options.method, headers: options.headers });
		if (!result.ok) {
			throw new JoplinError(`fetch failed: ${result.statusText}`, result.status);
		}

		const blob = await result.blob();
		await fsDriver().writeFile(outputPath, await blob.arrayBuffer(), 'buffer');
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
