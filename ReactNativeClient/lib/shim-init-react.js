const { shim } = require('lib/shim.js');
const { GeolocationReact } = require('lib/geolocation-react.js');
const { PoorManIntervals } = require('lib/poor-man-intervals.js');
const RNFetchBlob = require('react-native-fetch-blob').default;

function shimInit() {
	shim.Geolocation = GeolocationReact;

	shim.setInterval = PoorManIntervals.setInterval;
	shim.clearInterval = PoorManIntervals.clearInterval;

	shim.fetch = async function(url, options = null) {
		return shim.fetchWithRetry(() => {
			return shim.nativeFetch_(url, options)
		}, options);

		// if (!options) options = {};
		// if (!options.timeout) options.timeout = 1000 * 120; // ms
		// if (!('maxRetry' in options)) options.maxRetry = 5;

		// let retryCount = 0;
		// while (true) {
		// 	try {
		// 		const response = await nodeFetch(url, options);
		// 		return response;
		// 	} catch (error) {
		// 		if (fetchRequestCanBeRetried(error)) {
		// 			retryCount++;
		// 			if (retryCount > options.maxRetry) throw error;
		// 			await time.sleep(retryCount * 3);
		// 		} else {
		// 			throw error;
		// 		}
		// 	}
		// }
	}

	shim.fetchBlob = async function(url, options) {
		if (!options || !options.path) throw new Error('fetchBlob: target file path is missing');

		let headers = options.headers ? options.headers : {};
		let method = options.method ? options.method : 'GET';

		let dirs = RNFetchBlob.fs.dirs;
		let localFilePath = options.path;
		if (localFilePath.indexOf('/') !== 0) localFilePath = dirs.DocumentDir + '/' + localFilePath;

		delete options.path;

		const doFetchBlob = () => {
			return RNFetchBlob.config({
				path: localFilePath
			}).fetch(method, url, headers);
		}

		try {
			const response = await shim.fetchWithRetry(doFetchBlob, options);
			// let response = await RNFetchBlob.config({
			// 	path: localFilePath
			// }).fetch(method, url, headers);

			// Returns an object that's roughtly compatible with a standard Response object
			let output = {
				ok: response.respInfo.status < 400,
				path: response.data,
				text: response.text,
				json: response.json,
				status: response.respInfo.status,
				headers: response.respInfo.headers,
			};

			return output;
		} catch (error) {
			throw new Error('fetchBlob: ' + method + ' ' + url + ': ' + error.toString());
		}
	}

	shim.uploadBlob = async function(url, options) {
		if (!options || !options.path) throw new Error('uploadBlob: source file path is missing');

		const headers = options.headers ? options.headers : {};
		const method = options.method ? options.method : 'POST';

		try {
			let response = await RNFetchBlob.fetch(method, url, headers, RNFetchBlob.wrap(options.path));

			// Returns an object that's roughtly compatible with a standard Response object
			return {
				ok: response.respInfo.status < 400,
				data: response.data,
				text: response.text,
				json: response.json,
				status: response.respInfo.status,
				headers: response.respInfo.headers,
			};
		} catch (error) {
			throw new Error('uploadBlob: ' + method + ' ' + url + ': ' + error.toString());
		}
	}

	shim.readLocalFileBase64 = async function(path) {
		return RNFetchBlob.fs.readFile(path, 'base64')
	}
}

module.exports = { shimInit };