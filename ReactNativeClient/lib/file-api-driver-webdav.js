const BaseItem = require('lib/models/BaseItem.js');
const { time } = require('lib/time-utils.js');
const { basicDelta } = require('lib/file-api');
const { rtrimSlashes, ltrimSlashes } = require('lib/path-utils.js');
const Entities = require('html-entities').AllHtmlEntities;
const html_entity_decode = (new Entities()).decode;

class FileApiDriverWebDav { 

	constructor(api) {
		this.api_ = api;
	}

	api() {
		return this.api_;
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
		const isCollection = this.api().stringFromJson(resource, ['d:propstat', 0, 'd:prop', 0, 'd:resourcetype', 0, 'd:collection', 0]);
		const lastModifiedString = this.api().stringFromJson(resource, ['d:propstat', 0, 'd:prop', 0, 'd:getlastmodified', 0]);

		if (!lastModifiedString) throw new Error('Could not get lastModified date: ' + JSON.stringify(resource));

		const lastModifiedDate = new Date(lastModifiedString);
		if (isNaN(lastModifiedDate.getTime())) throw new Error('Invalid date: ' + lastModifiedString);

		return {
			path: path,
			created_time: lastModifiedDate.getTime(),
			updated_time: lastModifiedDate.getTime(),
			isDir: isCollection === '',
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

	async list(path, options) {
		const relativeBaseUrl = this.api().relativeBaseUrl();

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

		async function parsePropFindXml2(xmlString) {
			const regex = /<d:response>[\S\s]*?<d:href>([\S\s]*?)<\/d:href>[\S\s]*?<d:getlastmodified>(.*?)<\/d:getlastmodified>/g;

			let output = [];
			let match = null;

			while (match = regex.exec(xmlString)) {
				const href = html_entity_decode(match[1]);
				if (href.indexOf(relativeBaseUrl) < 0) throw new Error('Path not inside base URL: ' + relativeBaseUrl); // Normally not possible
				const path = rtrimSlashes(ltrimSlashes(href.substr(relativeBaseUrl.length)));

				if (!path) continue; // The list of resources includes the root dir too, which we don't want

				const lastModifiedDate = new Date(match[2]);
				if (isNaN(lastModifiedDate.getTime())) throw new Error('Invalid date: ' + match[2]);

				output.push({
					path: path,
					updated_time: lastModifiedDate.getTime(),
					created_time: lastModifiedDate.getTime(),
					isDir: !BaseItem.isSystemPath(path),
				});
			}

			return output;
		}

		const resultXml = await this.api().execPropFind(path, 1, [
			'd:getlastmodified',
			//'d:resourcetype', // Include this to use parsePropFindXml()
		], { responseFormat: 'text' });

		const stats = await parsePropFindXml2(resultXml);

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
			return await this.api().exec('GET', path, null, null, options);
		} catch (error) {
			if (error.code !== 404) throw error;
		}
	}

	async mkdir(path) {
		try {
			await this.api().exec('MKCOL', path);
		} catch (error) {
			if (error.code !== 405) throw error; // 405 means that the collection already exists (Method Not Allowed)
		}
	}

	async put(path, content, options = null) {
		await this.api().exec('PUT', path, content, null, options);
	}

	async delete(path) {
		try {
			await this.api().exec('DELETE', path);
		} catch (error) {
			if (error.code !== 404) throw error;
		}
	}

	async move(oldPath, newPath) {
		throw new Error('Not implemented');
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