const BaseItem = require('lib/models/BaseItem.js');
const { time } = require('lib/time-utils.js');
const { basicDelta } = require('lib/file-api');
const { rtrimSlashes, ltrimSlashes } = require('lib/path-utils.js');
const Entities = require('html-entities').AllHtmlEntities;
const html_entity_decode = (new Entities()).decode;
const { shim } = require('lib/shim');
const { basename } = require('lib/path-utils');
const JoplinError = require('lib/JoplinError');

class FileApiDriverWebDav { 

	constructor(api) {
		this.api_ = api;
	}

	api() {
		return this.api_;
	}

	requestRepeatCount() {
		return 3;
	}

	async stat(path) {
		try {
			const result = await this.api().execPropFind(path, 0, [
				'd:getlastmodified',
				'd:resourcetype',
			]);

			const resource = this.api().objectFromJson(result, ['d:multistatus', 'd:response', 0]);
			return this.statFromResource_(resource, path);
		} catch (error) {
			if (error.code === 404) return null;
			throw error;
		}
	}

	statFromResource_(resource, path) {
		// WebDAV implementations are always slighly different from one server to another but, at the minimum,
		// a resource should have a propstat key - if not it's probably an error.
		const propStat = this.api().arrayFromJson(resource, ['d:propstat']);
		if (!Array.isArray(propStat)) throw new Error('Invalid WebDAV resource format: ' + JSON.stringify(resource));

		const resourceTypes = this.api().resourcePropByName(resource, 'array', 'd:resourcetype');
		let isDir = false;
		if (Array.isArray(resourceTypes)) {
			for (let i = 0; i < resourceTypes.length; i++) {
				const t = resourceTypes[i];
				if (typeof t === 'object' && 'd:collection' in t) {
					isDir = true;
					break;
				}
			}
		}

		const lastModifiedString = this.api().resourcePropByName(resource, 'string', 'd:getlastmodified');

		// Note: Not all WebDAV servers return a getlastmodified date (eg. Seafile, which doesn't return the
		// property for folders) so we can only throw an error if it's a file.
		if (!lastModifiedString && !isDir) throw new Error('Could not get lastModified date for resource: ' + JSON.stringify(resource));
		const lastModifiedDate = lastModifiedString ? new Date(lastModifiedString) : new Date();
		if (isNaN(lastModifiedDate.getTime())) throw new Error('Invalid date: ' + lastModifiedString);

		return {
			path: path,
			updated_time: lastModifiedDate.getTime(),
			isDir: isDir,
		};
	}

	async setTimestamp(path, timestampMs) {
		throw new Error('Not implemented'); // Not needed anymore
	}

	async delta(path, options) {
		const getDirStats = async (path) => {
			const result = await this.list(path);
			return result.items;
		};

		return await basicDelta(path, getDirStats, options);
	}

	// A file href, as found in the result of a PROPFIND, can be either an absolute URL or a
	// relative URL (an absolute URL minus the protocol and domain), while the sync algorithm
	// works with paths relative to the base URL.
	hrefToRelativePath_(href, baseUrl, relativeBaseUrl) {
		let output = '';
		if (href.indexOf(baseUrl) === 0) {
			output = href.substr(baseUrl.length);
		} else if (href.indexOf(relativeBaseUrl) === 0) {
			output = href.substr(relativeBaseUrl.length);
		} else {
			throw new Error('href ' + href + ' not in baseUrl ' + baseUrl + ' nor relativeBaseUrl ' + relativeBaseUrl);
		}

		return rtrimSlashes(ltrimSlashes(output));
	}

	statsFromResources_(resources) {
		const relativeBaseUrl = this.api().relativeBaseUrl();
		const baseUrl = this.api().baseUrl();
		let output = [];
		for (let i = 0; i < resources.length; i++) {
			const resource = resources[i];
			const href = this.api().stringFromJson(resource, ['d:href', 0]);
			const path = this.hrefToRelativePath_(href, baseUrl, relativeBaseUrl);
			// if (href.indexOf(relativeBaseUrl) !== 0) throw new Error('Path "' + href + '" not inside base URL: ' + relativeBaseUrl);
			// const path = rtrimSlashes(ltrimSlashes(href.substr(relativeBaseUrl.length)));
			if (path === '') continue; // The list of resources includes the root dir too, which we don't want
			const stat = this.statFromResource_(resources[i], path);
			output.push(stat);
		}
		return output;
	}

	async list(path, options) {
		// const relativeBaseUrl = this.api().relativeBaseUrl();

		// function parsePropFindXml(xmlString) {
		// 	return new Promise(async (resolve, reject) => {
		// 		const saxOptions = {};
		// 		const saxParser = require('sax').parser(false, { position: false });

		// 		let stats = [];
		// 		let currentStat = null;
		// 		let currentText = '';

		// 		// When this is on, the tags from the bloated XML string are replaced by shorter ones, 
		// 		// which makes parsing about 25% faster. However it's a bit of a hack so keep it as
		// 		// an option so that it can be disabled if it causes problems.
		// 		const optimizeXml = true;

		// 		const tagResponse = optimizeXml ? 'd:r' : 'd:response';
		// 		const tagGetLastModified = optimizeXml ? 'd:glm' : 'd:getlastmodified';
		// 		const tagPropStat = optimizeXml ? 'd:ps' : 'd:propstat';
		// 		const replaceUrls = optimizeXml;

		// 		saxParser.onerror = function (error) {
		// 			reject(new Error(e.toString()));
		// 		};

		// 		saxParser.ontext = function (t) {
		// 			currentText += t;
		// 		};

		// 		saxParser.onopentag = function (node) {
		// 			const tagName = node.name.toLowerCase();

		// 			currentText = '';

		// 			if (tagName === tagResponse) {
		// 				currentStat = { isDir: false };
		// 			}
		// 		};

		// 		saxParser.onclosetag = function(tagName) {
		// 			tagName = tagName.toLowerCase();
					
		// 			if (tagName === tagResponse) {
		// 				if (currentStat.path) { // The list of resources includes the root dir too, which we don't want
		// 					if (!currentStat.updated_time) throw new Error('Resource does not have a getlastmodified prop');
		// 					stats.push(currentStat);
		// 				}
		// 				currentStat = null;
		// 			}

		// 			if (tagName === 'd:href') {
		// 				const href = currentText;

		// 				if (replaceUrls) {
		// 					currentStat.path = rtrimSlashes(ltrimSlashes(href));
		// 				} else {
		// 					if (href.indexOf(relativeBaseUrl) < 0) throw new Error('Path not inside base URL: ' + relativeBaseUrl); // Normally not possible
		// 					currentStat.path = rtrimSlashes(ltrimSlashes(href.substr(relativeBaseUrl.length)));
		// 				}
		// 			}

		// 			if (tagName === tagGetLastModified) {
		// 				const lastModifiedDate = new Date(currentText);
		// 				if (isNaN(lastModifiedDate.getTime())) throw new Error('Invalid date: ' + currentText);
		// 				currentStat.updated_time = lastModifiedDate.getTime();
		// 				currentStat.created_time = currentStat.updated_time;
		// 			}

		// 			if (tagName === 'd:collection') {
		// 				currentStat.isDir = true;
		// 			}

		// 			currentText = '';
		// 		}

		// 		saxParser.onend = function () {
		// 			resolve(stats);
		// 		};

		// 		if (optimizeXml) {
		// 			xmlString = xmlString.replace(/<d:status>HTTP\/1\.1 200 OK<\/d:status>/ig, ''); 
		// 			xmlString = xmlString.replace(/<d:resourcetype\/>/ig, ''); 
		// 			xmlString = xmlString.replace(/d:getlastmodified/ig, tagGetLastModified); 
		// 			xmlString = xmlString.replace(/d:response/ig, tagResponse); 
		// 			xmlString = xmlString.replace(/d:propstat/ig, tagPropStat); 
		// 			if (replaceUrls) xmlString = xmlString.replace(new RegExp(relativeBaseUrl, 'gi'), ''); 
		// 		}

		// 		let idx = 0;
		// 		let size = 1024 * 100;
		// 		while (true) {
		// 			sub = xmlString.substr(idx, size);
		// 			if (!sub.length) break;
		// 			saxParser.write(sub);
		// 			idx += size;
		// 			//await time.msleep(500);
		// 		}

		// 		saxParser.close();

		// 		//saxParser.write(xmlString).close();
		// 	});
		// }

		// For performance reasons, the response of the PROPFIND call is manually parsed with a regex below
		// instead of being processed by xml2json like the other WebDAV responses. This is over 2 times faster
		// and it means the mobile app does not freeze during sync. 

		// async function parsePropFindXml2(xmlString) {
		// 	const regex = /<d:response>[\S\s]*?<d:href>([\S\s]*?)<\/d:href>[\S\s]*?<d:getlastmodified>(.*?)<\/d:getlastmodified>/g;

		// 	let output = [];
		// 	let match = null;

		// 	while (match = regex.exec(xmlString)) {
		// 		const href = html_entity_decode(match[1]);
		// 		if (href.indexOf(relativeBaseUrl) < 0) throw new Error('Path not inside base URL: ' + relativeBaseUrl); // Normally not possible
		// 		const path = rtrimSlashes(ltrimSlashes(href.substr(relativeBaseUrl.length)));

		// 		if (!path) continue; // The list of resources includes the root dir too, which we don't want

		// 		const lastModifiedDate = new Date(match[2]);
		// 		if (isNaN(lastModifiedDate.getTime())) throw new Error('Invalid date: ' + match[2]);

		// 		output.push({
		// 			path: path,
		// 			updated_time: lastModifiedDate.getTime(),
		// 			created_time: lastModifiedDate.getTime(),
		// 			isDir: !BaseItem.isSystemPath(path),
		// 		});
		// 	}

		// 	return output;
		// }

		// const resultXml = await this.api().execPropFind(path, 1, [
		// 	'd:getlastmodified',
		// 	//'d:resourcetype', // Include this to use parsePropFindXml()
		// ], { responseFormat: 'text' });

		// const stats = await parsePropFindXml2(resultXml);

		// return {
		// 	items: stats,
		// 	hasMore: false,
		// 	context: null,
		// };

		const result = await this.api().execPropFind(path, 1, [
			'd:getlastmodified',
			'd:resourcetype',
		]);

		const resources = this.api().arrayFromJson(result, ['d:multistatus', 'd:response']);
		const stats = this.statsFromResources_(resources);

		return {
			items: stats,
			hasMore: false,
			context: null,
		};
	}

	async get(path, options) {
		if (!options) options = {};
		if (!options.responseFormat) options.responseFormat = 'text';
		try {
			const response = await this.api().exec('GET', path, null, null, options);

			// This is awful but instead of a 404 Not Found, Microsoft IIS returns an HTTP code 200
			// with a response body "The specified file doesn't exist." for non-existing files,
			// so we need to check for this.
			if (response === "The specified file doesn't exist.") throw new JoplinError(response, 404);
			return response;
		} catch (error) {
			if (error.code !== 404) throw error;
		}
	}

	async mkdir(path) {
		try {
			await this.api().exec('MKCOL', path);
		} catch (error) {
			if (error.code === 405) return; // 405 means that the collection already exists (Method Not Allowed)

			// 409 should only be returned if a parent path does not exists (eg. when trying to create a/b/c when a/b does not exist)
			// however non-compliant servers (eg. Microsoft IIS) also return this code when the directory already exists. So here, if
			// we get this code, verify that indeed the directory already exists and exit if it does.
			if (error.code === 409) {
				const stat = await this.stat(path);
				if (stat) return;
			}
			
			throw error;
		}
	}

	async put(path, content, options = null) {
		return await this.api().exec('PUT', path, content, null, options);
	}

	async delete(path) {
		try {
			await this.api().exec('DELETE', path);
		} catch (error) {
			if (error.code !== 404) throw error;
		}
	}

	async move(oldPath, newPath) {
		await this.api().exec('MOVE', oldPath, null, {
			'Destination': this.api().baseUrl() + '/' + newPath,
			'Overwrite': 'T',
		});
	}

	format() {
		throw new Error('Not supported');
	}

	async clearRoot() {
		await this.delete('');
		await this.mkdir('');
	}

}

module.exports = { FileApiDriverWebDav };