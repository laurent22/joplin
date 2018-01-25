const BaseItem = require('lib/models/BaseItem.js');
const { time } = require('lib/time-utils.js');
const { basicDelta } = require('lib/file-api');
const { rtrimSlashes, ltrimSlashes } = require('lib/path-utils.js');

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

	statsFromResources_(resources) {
		const relativeBaseUrl = this.api().relativeBaseUrl();
		let output = [];
		for (let i = 0; i < resources.length; i++) {
			const resource = resources[i];
			const href = this.api().stringFromJson(resource, ['d:href', 0]);
			if (href.indexOf(relativeBaseUrl) < 0) throw new Error('Path not inside base URL: ' + relativeBaseUrl); // Normally not possible
			const path = rtrimSlashes(ltrimSlashes(href.substr(relativeBaseUrl.length)));
			if (path === '') continue; // The list of resources includes the root dir too, which we don't want
			const stat = this.statFromResource_(resources[i], path);
			output.push(stat);
		}
		return output;
	}

	async setTimestamp(path, timestampMs) {
		throw new Error('Not implemented'); // Not needed anymore
	}

	async delta(path, options) {
		const getDirStats = async (path) => {
			const result = await this.api().execPropFind(path, 1, [
				'd:getlastmodified',
				'd:resourcetype',
			]);

			const resources = this.api().arrayFromJson(result, ['d:multistatus', 'd:response']);
			return this.statsFromResources_(resources);
		};

		return await basicDelta(path, getDirStats, options);
	}

	async list(path, options) {
		throw new Error('Not implemented'); // Not needed
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

}

module.exports = { FileApiDriverWebDav };