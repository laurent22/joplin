const BaseItem = require('lib/models/BaseItem.js');
const { time } = require('lib/time-utils.js');

class FileApiDriverWebDav { 

	constructor(api) {
		this.api_ = api;
	}

	api() {
		return this.api_;
	}

	async stat(path) {
		const result = await this.api().execPropFind(path, [
			'd:getlastmodified',
			'd:resourcetype',
		]);

		return this.metadataFromStat_(result, path);
	}

	metadataFromStat_(stat, path) {
		const isCollection = this.api().stringFromJson(stat, ['d:multistatus', 'd:response', 0, 'd:propstat', 0, 'd:prop', 0, 'd:resourcetype', 0, 'd:collection', 0]);
		const lastModifiedString = this.api().stringFromJson(stat, ['d:multistatus', 'd:response', 0, 'd:propstat', 0, 'd:prop', 0, 'd:getlastmodified', 0]);

		if (!lastModifiedString) throw new Error('Could not get lastModified date: ' + JSON.stringify(stat));

		const lastModifiedDate = new Date(lastModifiedString);
		if (isNaN(lastModifiedDate.getTime())) throw new Error('Invalid date: ' + lastModifiedString);

		return {
			path: path,
			created_time: lastModifiedDate.getTime(),
			updated_time: lastModifiedDate.getTime(),
			isDir: isCollection === '',
		};
	}

	metadataFromStats_(stats) {
		let output = [];
		for (let i = 0; i < stats.length; i++) {
			const mdStat = this.metadataFromStat_(stats[i]);
			output.push(mdStat);
		}
		return output;
	}

	async setTimestamp(path, timestampMs) {
		throw new Error('Not implemented'); // Not needed anymore
	}

	async delta(path, options) {
		
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