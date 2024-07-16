import shimInitShared from './shimInitShared';

import shim from '@joplin/lib/shim';
const { GeolocationReact } = require('../geolocation-react.js');
import RNFetchBlob from 'rn-fetch-blob';
import { generateSecureRandom } from 'react-native-securerandom';
import FsDriverRN from '../fs-driver/fs-driver-rn';
import { Buffer } from 'buffer';
import { Linking, Platform } from 'react-native';
import showMessageBox from '../showMessageBox';
const RNExitApp = require('react-native-exit-app').default;

export default function shimInit() {
	shim.Geolocation = GeolocationReact;

	shim.fsDriver = () => {
		if (!shim.fsDriver_) {
			shim.fsDriver_ = new FsDriverRN();
		}
		return shim.fsDriver_;
	};

	shim.randomBytes = async (count: number) => {
		const randomBytes = await generateSecureRandom(count);
		const temp = [];
		for (const n in randomBytes) {
			if (!randomBytes.hasOwnProperty(n)) continue;
			temp.push(randomBytes[n]);
		}
		return temp;
	};

	// This function can be used to debug "Network Request Failed" errors. It
	// uses the native XMLHttpRequest which is more likely to get the proper
	// response and error message.

	/* eslint-disable no-console */

	shim.debugFetch = async (url, options = null) => {
		options = {
			method: 'GET',
			headers: {},
			...options,
		};

		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open(options.method, url, true);

			for (const [key, value] of Object.entries(options.headers as Record<string, string>)) {
				xhr.setRequestHeader(key, value);
			}

			xhr.onload = function() {
				console.info('======================== XHR RESPONSE');
				console.info(xhr.getAllResponseHeaders());
				console.info('-------------------------------------');
				// console.info(xhr.responseText);
				console.info('======================== XHR RESPONSE');

				resolve(xhr.responseText);
			};

			xhr.onerror = function() {
				console.info('======================== XHR ERROR');
				console.info(xhr.getAllResponseHeaders());
				console.info('-------------------------------------');
				console.info(xhr.responseText);
				console.info('======================== XHR ERROR');

				reject(new Error(xhr.responseText));
			};

			// TODO: Send POST data here if needed
			xhr.send();
		});
	};

	/* eslint-enable */

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

	shim.fetchBlob = async function(url, options) {
		if (!options || !options.path) throw new Error('fetchBlob: target file path is missing');

		const headers = options.headers ? options.headers : {};
		const method = options.method ? options.method : 'GET';
		const overwrite = 'overwrite' in options ? options.overwrite : true;

		const dirs = RNFetchBlob.fs.dirs;
		let localFilePath = options.path;
		if (localFilePath.indexOf('/') !== 0) localFilePath = `${dirs.DocumentDir}/${localFilePath}`;

		if (!overwrite) {
			if (await shim.fsDriver().exists(localFilePath)) {
				return { ok: true };
			}
		}

		delete options.path;
		delete options.overwrite;

		const doFetchBlob = () => {
			return RNFetchBlob.config({
				path: localFilePath,
				trusty: options.ignoreTlsErrors,
			}).fetch(method, url, headers);
		};

		try {
			const response = await shim.fetchWithRetry(doFetchBlob, options);

			// Returns an object that's roughly compatible with a standard Response object
			const output = {
				ok: response.respInfo.status < 400,
				path: response.data,
				status: response.respInfo.status,
				headers: response.respInfo.headers,
				// If response type is 'path' then calling text() or json() (or base64())
				// on RNFetchBlob response object will make it read the file on the native thread,
				// serialize it, and send over the RN bridge.
				// For larger files this can cause the app to crash.
				// For these type of responses we're not using the response text anyway
				// so can override it here to return empty values
				text: response.type === 'path' ? () => '' : response.text,
				json: response.type === 'path' ? () => {} : response.json,
			};

			return output;
		} catch (error) {
			throw new Error(`fetchBlob: ${method} ${url}: ${error.toString()}`);
		}
	};

	shim.uploadBlob = async function(url, options) {
		if (!options || !options.path) throw new Error('uploadBlob: source file path is missing');

		const headers = options.headers ? options.headers : {};
		const method = options.method ? options.method : 'POST';

		try {
			const response = await RNFetchBlob.config({
				trusty: options.ignoreTlsErrors,
			}).fetch(method, url, headers, RNFetchBlob.wrap(options.path));

			// Returns an object that's roughly compatible with a standard Response object
			return {
				ok: response.respInfo.status < 400,
				data: response.data,
				text: response.text,
				json: response.json,
				status: response.respInfo.status,
				headers: response.respInfo.headers,
			};
		} catch (error) {
			throw new Error(`uploadBlob: ${method} ${url}: ${error.toString()}`);
		}
	};

	shim.readLocalFileBase64 = async function(path) {
		return RNFetchBlob.fs.readFile(path, 'base64');
	};

	shim.stringByteLength = function(string) {
		return Buffer.byteLength(string, 'utf-8');
	};

	shim.Buffer = Buffer;

	shim.showMessageBox = showMessageBox;

	shim.openUrl = url => {
		return Linking.openURL(url);
	};

	shim.mobilePlatform = () => {
		return Platform.OS;
	};

	shim.appVersion = () => {
		const p = require('react-native-version-info').default;
		return p.appVersion;
	};

	shim.restartApp = () => {
		RNExitApp.exitApp();
	};

	shimInitShared();
}

