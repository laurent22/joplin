const { shim } = require('lib/shim.js');
const { GeolocationReact } = require('lib/geolocation-react.js');
const { PoorManIntervals } = require('lib/poor-man-intervals.js');
const RNFetchBlob = require('rn-fetch-blob').default;
const { generateSecureRandom } = require('react-native-securerandom');
const FsDriverRN = require('lib/fs-driver-rn.js').FsDriverRN;
const urlValidator = require('valid-url');
const { Buffer } = require('buffer');
const { Linking, Platform } = require('react-native');
const mimeUtils = require('lib/mime-utils.js').mime;
const { basename, fileExtension } = require('lib/path-utils.js');
const { uuid } = require('lib/uuid.js');
const Resource = require('lib/models/Resource');

const injectedJs = {
	webviewLib: require('lib/rnInjectedJs/webviewLib'),
};

function shimInit() {
	shim.Geolocation = GeolocationReact;
	shim.setInterval = PoorManIntervals.setInterval;
	shim.clearInterval = PoorManIntervals.clearInterval;
	shim.sjclModule = require('lib/vendor/sjcl-rn.js');

	shim.fsDriver = () => {
		if (!shim.fsDriver_) shim.fsDriver_ = new FsDriverRN();
		return shim.fsDriver_;
	};

	shim.randomBytes = async count => {
		const randomBytes = await generateSecureRandom(count);
		let temp = [];
		for (let n in randomBytes) {
			if (!randomBytes.hasOwnProperty(n)) continue;
			temp.push(randomBytes[n]);
		}
		return temp;
	};

	shim.fetch = async function(url, options = null) {
		// The native fetch() throws an uncatable error that crashes the app if calling it with an
		// invalid URL such as '//.resource' or "http://ocloud. de" so detect if the URL is valid beforehand
		// and throw a catchable error.
		// Bug: https://github.com/facebook/react-native/issues/7436
		const validatedUrl = urlValidator.isUri(url);
		if (!validatedUrl) throw new Error(`Not a valid URL: ${url}`);

		return shim.fetchWithRetry(() => {
			return fetch(validatedUrl, options);
		}, options);
	};

	shim.fetchBlob = async function(url, options) {
		if (!options || !options.path) throw new Error('fetchBlob: target file path is missing');

		let headers = options.headers ? options.headers : {};
		let method = options.method ? options.method : 'GET';
		const overwrite = 'overwrite' in options ? options.overwrite : true;

		let dirs = RNFetchBlob.fs.dirs;
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
			}).fetch(method, url, headers);
		};

		try {
			const response = await shim.fetchWithRetry(doFetchBlob, options);

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
			throw new Error(`fetchBlob: ${method} ${url}: ${error.toString()}`);
		}
	};

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

	shim.openUrl = url => {
		Linking.openURL(url);
	};

	shim.httpAgent = () => {
		return null;
	};

	shim.waitForFrame = () => {
		return new Promise(function(resolve) {
			requestAnimationFrame(function() {
				resolve();
			});
		});
	};

	shim.mobilePlatform = () => {
		return Platform.OS;
	};

	shim.appVersion = () => {
		const p = require('react-native-version-info').default;
		return p.appVersion;
	};

	// NOTE: This is a limited version of createResourceFromPath - unlike the Node version, it
	// only really works with images. It does not resize the image either.
	shim.createResourceFromPath = async function(filePath, defaultProps = null) {
		defaultProps = defaultProps ? defaultProps : {};
		const resourceId = defaultProps.id ? defaultProps.id : uuid.create();

		const ext = fileExtension(filePath);
		let mimeType = mimeUtils.fromFileExtension(ext);
		if (!mimeType) mimeType = 'image/jpeg';

		let resource = Resource.new();
		resource.id = resourceId;
		resource.mime = mimeType;
		resource.title = basename(filePath);
		resource.file_extension = ext;

		let targetPath = Resource.fullPath(resource);
		await shim.fsDriver().copy(filePath, targetPath);

		if (defaultProps) {
			resource = Object.assign({}, resource, defaultProps);
		}

		const itDoes = await shim.fsDriver().waitTillExists(targetPath);
		if (!itDoes) throw new Error(`Resource file was not created: ${targetPath}`);

		const fileStat = await shim.fsDriver().stat(targetPath);
		resource.size = fileStat.size;

		resource = await Resource.save(resource, { isNew: true });

		return resource;
	};

	shim.injectedJs = function(name) {
		if (!(name in injectedJs)) throw new Error(`Cannot find injectedJs file (add it to "injectedJs" object): ${name}`);
		return injectedJs[name];
	};
}

module.exports = { shimInit };
