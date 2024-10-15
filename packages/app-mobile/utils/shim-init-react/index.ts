import shimInitShared from './shimInitShared';

import shim from '@joplin/lib/shim';
const { GeolocationReact } = require('../geolocation-react.js');
import RNFetchBlob from 'rn-fetch-blob';
import { generateSecureRandom } from 'react-native-securerandom';
import FsDriverRN from '../fs-driver/fs-driver-rn';
import { Linking, Platform } from 'react-native';
import crypto from '../../services/e2ee/crypto';
const RNExitApp = require('react-native-exit-app').default;

export default function shimInit() {
	shim.Geolocation = GeolocationReact;

	shim.fsDriver = () => {
		if (!shim.fsDriver_) {
			shim.fsDriver_ = new FsDriverRN();
		}
		return shim.fsDriver_;
	};

	shim.crypto = crypto;

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

