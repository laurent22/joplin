const { Logger } = require('lib/logger.js');
const { shim } = require('lib/shim.js');
const parseXmlString = require('xml2js').parseString;
const JoplinError = require('lib/JoplinError');

// Note that the d: namespace (the DAV namespace) is specific to Nextcloud. The RFC for example uses "D:" however
// we make all the tags and attributes lowercase so we handle both the Nextcloud style and RFC. Hopefully other
// implementations use the same namespaces. If not, extra processing can be done in `nameProcessor`, for
// example to convert a custom namespace to "d:" so that it can be used by the rest of the code.
// In general, we should only deal with things in "d:", which is the standard DAV namespace.

class WebDavApi {

	constructor(baseUrl, options) {
		this.logger_ = new Logger();
		this.baseUrl_ = baseUrl.replace(/\/+$/, ""); // Remove last trailing slashes
		this.options_ = options;
	}

	setLogger(l) {
		this.logger_ = l;
	}

	logger() {
		return this.logger_;
	}

	authToken() {
		if (!this.options_.username || !this.options_.password) return null;
		return (new Buffer(this.options_.username + ':' + this.options_.password)).toString('base64');
	}

	baseUrl() {
		return this.baseUrl_;
	}

	davNs(json) {

	}

	async xmlToJson(xml) {

		const nameProcessor = (name) => {
			// const idx = name.indexOf(':');
			// if (idx >= 0) {
			// 	if (name.indexOf('xmlns:') !== 0) name = name.substr(idx + 1);
			// }
			return name.toLowerCase();
		};

		const options = {
			tagNameProcessors: [nameProcessor],
			attrNameProcessors: [nameProcessor],
		}

		return new Promise((resolve, reject) => {
			parseXmlString(xml, options, (error, result) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(result);
			});
		});
	}

	valueFromJson(json, keys, type) {
		let output = json;
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			if (!output || !output[key]) return null;
			output = output[key];
		}

		if (type === 'string') {
			if (typeof output !== 'string') return null;
			return output;
		}

		if (type === 'object') {
			if (!Array.isArray(output) && typeof output === 'object') return output;
			return null;
		}

		return null;
	}

	stringFromJson(json, keys) {
		return this.valueFromJson(json, keys, 'string');
		// let output = json;
		// for (let i = 0; i < keys.length; i++) {
		// 	const key = keys[i];
		// 	if (!output || !output[key]) return null;
		// 	output = output[key];
		// }
		// if (typeof output !== 'string') return null;
		// return output;
	}

	objectFromJson(json, keys) {
		return this.valueFromJson(json, keys, 'object');
		// let output = json;
		// for (let i = 0; i < keys.length; i++) {
		// 	const key = keys[i];
		// 	if (!output || !output[key]) return null;
		// 	output = output[key];
		// }
		// if (!Array.isArray(output) && typeof output === 'object') return output;
		// return null;
	}

	// isDirectory(propStat) {
	// 	try {
	// 		return propStat[0]['d:prop'][0]['d:resourcetype'][0]['d:collection'];
	// 	} catch (error) {
	// 		return false;
	// 	}
	// }

	async execPropFind(path, fields = null) {
		if (fields === null) fields = ['d:getlastmodified'];

		let fieldsXml = '';
		for (let i = 0; i < fields.length; i++) {
			fieldsXml += '<' + fields[i] + '/>';
		}

		// To find all available properties:
		//
		const body=`<?xml version="1.0" encoding="utf-8" ?>
			<propfind xmlns="DAV:">
			<propname/>
		</propfind>`;

		// const body = `<?xml version="1.0" encoding="UTF-8"?>
		// 	<d:propfind xmlns:d="DAV:">
		// 		<d:prop xmlns:oc="http://owncloud.org/ns">
		// 			` + fieldsXml + `
		// 		</d:prop>
		// 	</d:propfind>`;

		return this.exec('PROPFIND', path, body);
	}

	// curl -u admin:123456 'http://nextcloud.local/remote.php/dav/files/admin/' -X PROPFIND --data '<?xml version="1.0" encoding="UTF-8"?>
	//  <d:propfind xmlns:d="DAV:">
	//    <d:prop xmlns:oc="http://owncloud.org/ns">
	//      <d:getlastmodified/>
	//    </d:prop>
	//  </d:propfind>'

	async exec(method, path = '', body = null, headers = null) {
		if (headers === null) headers = {};

		const authToken = this.authToken();

		if (authToken) headers['Authorization'] = 'Basic ' + authToken;

		const fetchOptions = {};
		fetchOptions.headers = headers;
		fetchOptions.method = method;
		if (body) fetchOptions.body = body;

		const url = this.baseUrl() + '/' + path;

		const response = await shim.fetch(url, fetchOptions);
		const responseText = await response.text();
		const responseJson = await this.xmlToJson(responseText);

		if (!responseJson) throw new Error('Could not parse response: ' + responseText);

		if (responseJson['d:error']) {
			const code = responseJson['d:error']['s:exception'] ? responseJson['d:error']['s:exception'].join(' ') : null;
			const message = responseJson['d:error']['s:message'] ? responseJson['d:error']['s:message'].join("\n") : responseText;
			throw new JoplinError(message, code);
		}

		return responseJson;


		// //console.info(JSON.stringify(responseJson['d:multistatus']['d:response']));


		// body = `<?xml version="1.0" encoding="UTF-8"?>
		// 	<d:propfind xmlns:d="DAV:">
		// 		<d:prop xmlns:oc="http://owncloud.org/ns">
		// 			<d:getlastmodified/>
		// 		</d:prop>
		// 	</d:propfind>`;

		// const authToken = this.authToken();
		// const url = 'http://nextcloud.local/remote.php/dav/files/admin/Joplin';
		// const fetchOptions = {
		// 	method: 'PROPFIND',
		// 	headers: {
		// 		'Authorization': 'Basic ' + authToken,
		// 	},
		// 	body: body,
		// };

		// console.info(url, fetchOptions);

		// const response = await shim.fetch(url, fetchOptions);

		// console.info(await response.text());
	}

}

module.exports = WebDavApi;