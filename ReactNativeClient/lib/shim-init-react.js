import { shim } from 'lib/shim.js';
import { GeolocationReact } from 'lib/geolocation-react.js';
import RNFetchBlob from 'react-native-fetch-blob';

function shimInit() {
	shim.Geolocation = GeolocationReact;

	shim.fetchBlob = async function(url, options) {
		if (!options || !options.path) throw new Error('fetchBlob: target file path is missing');
		if (!options.method) options.method = 'GET';

		let headers = options.headers ? options.headers : {};
		let method = options.method ? options.method : 'GET';

		let dirs = RNFetchBlob.fs.dirs;
		let localFilePath = options.path;
		if (localFilePath.indexOf('/') !== 0) localFilePath = dirs.DocumentDir + '/' + localFilePath;

		delete options.path;

		try {
			let response = await RNFetchBlob.config({
				path: localFilePath
			}).fetch(method, url, headers);

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

	shim.readLocalFileBase64 = async function(path) {
		return RNFetchBlob.fs.readFile(path, 'base64')
	}
}

export { shimInit }