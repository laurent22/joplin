const { Logger } = require('lib/logger.js');
const { shim } = require('lib/shim.js');
const parseXmlString = require('xml2js').parseString;
const JoplinError = require('lib/JoplinError');
const URL = require('url-parse');
const { rtrimSlashes } = require('lib/path-utils.js');
const base64 = require('base-64');


// Note that the d: namespace (the DAV namespace) is specific to Nextcloud. The RFC for example uses "D:" however
// we make all the tags and attributes lowercase so we handle both the Nextcloud style and RFC. Hopefully other
// implementations use the same namespaces. If not, extra processing can be done in `nameProcessor`, for
// example to convert a custom namespace to "d:" so that it can be used by the rest of the code.
// In general, we should only deal with things in "d:", which is the standard DAV namespace.

class WebDavApi {
	constructor(options) {
		this.logger_ = new Logger();
		this.options_ = options;
		this.lastRequests_ = [];
	}

	logRequest_(request, responseText) {
		if (this.lastRequests_.length > 10) this.lastRequests_.splice(0, 1);

		const serializeRequest = (r) => {
			const options = Object.assign({}, r.options);
			if (typeof options.body === 'string') options.body = options.body.substr(0, 4096);
			const output = [];
			output.push(options.method ? options.method : 'GET');
			output.push(r.url);
			options.headers = Object.assign({}, options.headers);
			if (options.headers['Authorization']) options.headers['Authorization'] = '********';
			delete options.method;
			delete options.agent;
			output.push(JSON.stringify(options));
			return output.join(' ');
		};

		this.lastRequests_.push({
			timestamp: Date.now(),
			request: serializeRequest(request),
			response: responseText ? responseText.substr(0, 4096) : '',
		});
	}

	lastRequests() {
		return this.lastRequests_;
	}

	clearLastRequests() {
		this.lastRequests_ = [];
	}

	setLogger(l) {
		this.logger_ = l;
	}

	logger() {
		return this.logger_;
	}

	authToken() {
		if (!this.options_.username() || !this.options_.password()) return null;
		try {
			// Note: Non-ASCII passwords will throw an error about Latin1 characters - https://github.com/laurent22/joplin/issues/246
			// Tried various things like the below, but it didn't work on React Native:
			// return base64.encode(utf8.encode(this.options_.username() + ':' + this.options_.password()));
			return base64.encode(`${this.options_.username()}:${this.options_.password()}`);
		} catch (error) {
			error.message = `Cannot encode username/password: ${error.message}`;
			throw error;
		}
	}

	baseUrl() {
		return rtrimSlashes(this.options_.baseUrl());
	}

	relativeBaseUrl() {
		const url = new URL(this.baseUrl());
		return url.pathname + url.query;
	}

	async xmlToJson(xml) {
		let davNamespaces = []; // Yes, there can be more than one... xmlns:a="DAV:" xmlns:D="DAV:"

		const nameProcessor = name => {
			if (name.indexOf('xmlns') !== 0) {
				// Check if the current name is within the DAV namespace. If it is, normalise it
				// by moving it to the "d:" namespace, which is what all the functions are using.
				const p = name.split(':');
				if (p.length == 2) {
					const ns = p[0];
					if (davNamespaces.indexOf(ns) >= 0) {
						name = `d:${p[1]}`;
					}
				} else if (p.length === 1 && davNamespaces.indexOf('') >= 0) {
					// Also handle the case where the namespace alias is empty.
					// https://github.com/laurent22/joplin/issues/2002
					name = `d:${name}`;
				}
			}

			return name.toLowerCase();
		};

		const attrValueProcessor = (value, name) => {
			// The namespace is ususally specified like so: xmlns:D="DAV:" ("D" being the alias used in the tag names)
			// In some cases, the namespace can also be empty like so: "xmlns=DAV". In this case, the tags will have
			// no namespace so instead of <d:prop> will have just <prop>. This is handled above in nameProcessor()
			if (value.toLowerCase() === 'dav:') {
				const p = name.split(':');
				davNamespaces.push(p.length === 2 ? p[p.length - 1] : '');
			}
		};

		const options = {
			tagNameProcessors: [nameProcessor],
			attrNameProcessors: [nameProcessor],
			attrValueProcessors: [attrValueProcessor],
		};

		return new Promise((resolve) => {
			parseXmlString(xml, options, (error, result) => {
				if (error) {
					resolve(null); // Error handled by caller which will display the XML text (or plain text) if null is returned from this function
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

			// console.info(key, typeof key, typeof output, typeof output === 'object' && (key in output), Array.isArray(output));

			if (typeof key === 'number' && !Array.isArray(output)) return null;
			if (typeof key === 'string' && (typeof output !== 'object' || !(key in output))) return null;
			output = output[key];
		}

		if (type === 'string') {
			// If the XML has not attribute the value is directly a string
			// If the XML node has attributes, the value is under "_".
			// Eg for this XML, the string will be under {"_":"Thu, 01 Feb 2018 17:24:05 GMT"}:
			// <a:getlastmodified b:dt="dateTime.rfc1123">Thu, 01 Feb 2018 17:24:05 GMT</a:getlastmodified>
			// For this XML, the value will be "Thu, 01 Feb 2018 17:24:05 GMT"
			// <a:getlastmodified>Thu, 01 Feb 2018 17:24:05 GMT</a:getlastmodified>

			if (typeof output === 'object' && '_' in output) output = output['_'];
			if (typeof output !== 'string') return null;
			return output;
		}

		if (type === 'object') {
			if (!Array.isArray(output) && typeof output === 'object') return output;
			return null;
		}

		if (type === 'array') {
			return Array.isArray(output) ? output : null;
		}

		return null;
	}

	stringFromJson(json, keys) {
		return this.valueFromJson(json, keys, 'string');
	}

	objectFromJson(json, keys) {
		return this.valueFromJson(json, keys, 'object');
	}

	arrayFromJson(json, keys) {
		return this.valueFromJson(json, keys, 'array');
	}

	resourcePropByName(resource, outputType, propName) {
		const propStats = resource['d:propstat'];
		let output = null;
		if (!Array.isArray(propStats)) throw new Error('Missing d:propstat property');
		for (let i = 0; i < propStats.length; i++) {
			const props = propStats[i]['d:prop'];
			if (!Array.isArray(props) || !props.length) continue;
			const prop = props[0];
			if (Array.isArray(prop[propName])) {
				output = prop[propName];
				break;
			}
		}

		if (outputType === 'string') {
			if (!output) throw new JoplinError(`String property not found: ${propName}: ${JSON.stringify(resource)}`, 'stringNotFound');

			// If the XML has not attribute the value is directly a string
			// If the XML node has attributes, the value is under "_".
			// Eg for this XML, the string will be under {"_":"Thu, 01 Feb 2018 17:24:05 GMT"}:
			// <a:getlastmodified b:dt="dateTime.rfc1123">Thu, 01 Feb 2018 17:24:05 GMT</a:getlastmodified>
			// For this XML, the value will be "Thu, 01 Feb 2018 17:24:05 GMT"
			// <a:getlastmodified>Thu, 01 Feb 2018 17:24:05 GMT</a:getlastmodified>

			output = output[0];

			if (typeof output === 'object' && '_' in output) output = output['_'];
			if (typeof output !== 'string') return null;
			return output;
		}

		if (outputType === 'array') {
			return output;
		}

		throw new Error(`Invalid output type: ${outputType}`);
	}

	async execPropFind(path, depth, fields = null, options = null) {
		if (fields === null) fields = ['d:getlastmodified'];

		let fieldsXml = '';
		for (let i = 0; i < fields.length; i++) {
			fieldsXml += `<${fields[i]}/>`;
		}

		// To find all available properties:
		//
		// const body=`<?xml version="1.0" encoding="utf-8" ?>
		// 	<propfind xmlns="DAV:">
		// 	<propname/>
		// </propfind>`;

		const body =
			`<?xml version="1.0" encoding="UTF-8"?>
			<d:propfind xmlns:d="DAV:">
				<d:prop xmlns:oc="http://owncloud.org/ns">
					${fieldsXml}
				</d:prop>
			</d:propfind>`;

		return this.exec('PROPFIND', path, body, { Depth: depth }, options);
	}

	requestToCurl_(url, options) {
		let output = [];
		output.push('curl');
		output.push('-v');
		if (options.method) output.push(`-X ${options.method}`);
		if (options.headers) {
			for (let n in options.headers) {
				if (!options.headers.hasOwnProperty(n)) continue;
				output.push(`${'-H ' + '"'}${n}: ${options.headers[n]}"`);
			}
		}
		if (options.body) output.push(`${'--data ' + '\''}${options.body}'`);
		output.push(url);

		return output.join(' ');
	}

	handleNginxHack_(jsonResponse, newErrorHandler) {
		// Trying to fix 404 error issue with Nginx WebDAV server.
		// https://github.com/laurent22/joplin/issues/624
		// https://github.com/laurent22/joplin/issues/808
		// Not tested but someone confirmed it worked - https://github.com/laurent22/joplin/issues/808#issuecomment-443552858
		// and fix is narrowly scoped so shouldn't affect anything outside this particular edge case.
		//
		// The issue is that instead of an HTTP 404 status code, Nginx returns 200 but with this response:
		//
		// <?xml version="1.0" encoding="utf-8" ?>
		// <D:multistatus xmlns:D="DAV:">
		// 	<D:response>
		// 		<D:href>/notes/ecd4027a5271483984b00317433e2c66.md</D:href>
		// 		<D:propstat>
		// 			<D:prop/>
		// 			<D:status>HTTP/1.1 404 Not Found</D:status>
		// 		</D:propstat>
		// 	</D:response>
		// </D:multistatus>
		//
		// So we need to parse this and find that it is in fact a 404 error.
		//
		// HOWEVER, some implementations also return 404 for missing props, for example SeaFile:
		// (indicates that the props "getlastmodified" is not present, but this call is only
		// used when checking the conf, so we don't really need it)
		// https://github.com/laurent22/joplin/issues/1137
		//
		// <?xml version='1.0' encoding='UTF-8'?>
		// <ns0:multistatus xmlns:ns0="DAV:">
		// 	<ns0:response>
		// 		<ns0:href>/seafdav/joplin/</ns0:href>
		// 		<ns0:propstat>
		// 			<ns0:prop>
		// 				<ns0:getlastmodified/>
		// 			</ns0:prop>
		// 			<ns0:status>HTTP/1.1 404 Not Found</ns0:status>
		// 		</ns0:propstat>
		// 		<ns0:propstat>
		// 			<ns0:prop>
		// 				<ns0:resourcetype>
		// 					<ns0:collection/>
		// 				</ns0:resourcetype>
		// 			</ns0:prop>
		// 			<ns0:status>HTTP/1.1 200 OK</ns0:status>
		// 		</ns0:propstat>
		// 	</ns0:response>
		// </ns0:multistatus>
		//
		// As a simple fix for now it's enough to check if ALL the statuses are 404 - in that case
		// it really means that the file doesn't exist. Otherwise we can proceed as usual.
		const responseArray = this.arrayFromJson(jsonResponse, ['d:multistatus', 'd:response']);
		if (responseArray && responseArray.length === 1) {
			const propStats = this.arrayFromJson(jsonResponse, ['d:multistatus', 'd:response', 0, 'd:propstat']);
			if (!propStats.length) return;
			let count404 = 0;
			for (let i = 0; i < propStats.length; i++) {
				const status = this.arrayFromJson(jsonResponse, ['d:multistatus', 'd:response', 0, 'd:propstat', i, 'd:status']);
				if (status && status.length && status[0].indexOf('404') >= 0) count404++;
			}

			if (count404 === propStats.length) throw newErrorHandler('Not found', 404);
		}
	}

	// curl -u admin:123456 'http://nextcloud.local/remote.php/dav/files/admin/' -X PROPFIND --data '<?xml version="1.0" encoding="UTF-8"?>
	//  <d:propfind xmlns:d="DAV:">
	//    <d:prop xmlns:oc="http://owncloud.org/ns">
	//      <d:getlastmodified/>
	//    </d:prop>
	//  </d:propfind>'

	async exec(method, path = '', body = null, headers = null, options = null) {
		if (headers === null) headers = {};
		if (options === null) options = {};
		if (!options.responseFormat) options.responseFormat = 'json';
		if (!options.target) options.target = 'string';

		const authToken = this.authToken();

		if (authToken) headers['Authorization'] = `Basic ${authToken}`;

		// On iOS, the network lib appends a If-None-Match header to PROPFIND calls, which is kind of correct because
		// the call is idempotent and thus could be cached. According to RFC-7232 though only GET and HEAD should have
		// this header for caching purposes. It makes no mention of PROPFIND.
		// So possibly because of this, Seafile (and maybe other WebDAV implementations) responds with a "412 Precondition Failed"
		// error when this header is present for PROPFIND call on existing resources. This is also kind of correct because there is a resource
		// with this eTag and since this is neither a GET nor HEAD call, it is supposed to respond with 412 if the resource is present.
		// The "solution", an ugly one, is to send a purposely invalid string as eTag, which will bypass the If-None-Match check  - Seafile
		// finds out that no resource has this ID and simply sends the requested data.
		// Also add a random value to make sure the eTag is unique for each call.
		if (['GET', 'HEAD'].indexOf(method) < 0) headers['If-None-Match'] = `JoplinIgnore-${Math.floor(Math.random() * 100000)}`;
		if (!headers['User-Agent']) headers['User-Agent'] = 'Joplin/1.0';

		const fetchOptions = {};
		fetchOptions.headers = headers;
		fetchOptions.method = method;
		if (options.path) fetchOptions.path = options.path;
		if (body) fetchOptions.body = body;
		const url = `${this.baseUrl()}/${path}`;

		if (shim.httpAgent(url)) fetchOptions.agent = shim.httpAgent(url);


		let response = null;

		// console.info('WebDAV Call', `${method} ${url}`, headers, options);
		// console.info(this.requestToCurl_(url, fetchOptions));

		if (options.source == 'file' && (method == 'POST' || method == 'PUT')) {
			if (fetchOptions.path) {
				const fileStat = await shim.fsDriver().stat(fetchOptions.path);
				if (fileStat) fetchOptions.headers['Content-Length'] = `${fileStat.size}`;
			}
			response = await shim.uploadBlob(url, fetchOptions);
		} else if (options.target == 'string') {
			if (typeof body === 'string') fetchOptions.headers['Content-Length'] = `${shim.stringByteLength(body)}`;
			response = await shim.fetch(url, fetchOptions);
		} else {
			// file
			response = await shim.fetchBlob(url, fetchOptions);
		}

		const responseText = await response.text();

		this.logRequest_({ url: url, options: fetchOptions }, responseText);

		// console.info('WebDAV Response', responseText);

		// Creates an error object with as much data as possible as it will appear in the log, which will make debugging easier
		const newError = (message, code = 0) => {
			// Gives a shorter response for error messages. Useful for cases where a full HTML page is accidentally loaded instead of
			// JSON. That way the error message will still show there's a problem but without filling up the log or screen.
			const shortResponseText = (`${responseText}`).substr(0, 1024);
			return new JoplinError(`${method} ${path}: ${message} (${code}): ${shortResponseText}`, code);
		};

		let responseJson_ = null;
		const loadResponseJson = async () => {
			if (!responseText) return null;
			if (responseJson_) return responseJson_;
			// eslint-disable-next-line require-atomic-updates
			responseJson_ = await this.xmlToJson(responseText);
			if (!responseJson_) throw newError('Cannot parse XML response', response.status);
			return responseJson_;
		};

		if (!response.ok) {
			// When using fetchBlob we only get a string (not xml or json) back
			if (options.target === 'file') throw newError('fetchBlob error', response.status);

			let json = null;
			try {
				json = await loadResponseJson();
			} catch (error) {
				// Just send back the plain text in newErro()
			}

			if (json && json['d:error']) {
				const code = json['d:error']['s:exception'] ? json['d:error']['s:exception'].join(' ') : response.status;
				const message = json['d:error']['s:message'] ? json['d:error']['s:message'].join('\n') : 'Unknown error 1';
				throw newError(`${message} (Exception ${code})`, response.status);
			}

			throw newError('Unknown error 2', response.status);
		}

		if (options.responseFormat === 'text') return responseText;

		// The following methods may have a response depending on the server but it's not
		// standard (some return a plain string, other XML, etc.) and we don't check the
		// response anyway since we rely on the HTTP status code so return null.
		if (['MKCOL', 'DELETE', 'PUT', 'MOVE'].indexOf(method) >= 0) return null;

		const output = await loadResponseJson();
		if (output) this.handleNginxHack_(output, newError);

		// Check that we didn't get for example an HTML page (as an error) instead of the JSON response
		// null responses are possible, for example for DELETE calls
		if (output !== null && typeof output === 'object' && !('d:multistatus' in output)) throw newError('Not a valid WebDAV response');

		return output;
	}
}

module.exports = WebDavApi;
