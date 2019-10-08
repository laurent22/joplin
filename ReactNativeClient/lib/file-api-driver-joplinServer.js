const { basicDelta } = require('lib/file-api');
const { dirname, basename } = require('lib/path-utils');

function removeTrailingColon(path) {
	if (!path || !path.length) return '';
	if (path[path.length - 1] === ':') return path.substr(0, path.length - 1);
	return path;
}

// All input paths should be in the format: "SPECIAL_DIR:/path/to/file"
// The trailing colon must not be included as it's automatically added
// when doing the API call.
// Only supported special dir at the moment is "root"

class FileApiDriverJoplinServer {

	constructor(api) {
		this.api_ = api;
	}

	async initialize(basePath) {
		const pieces = removeTrailingColon(basePath).split('/');
		if (!pieces.length) return;

		let parent = pieces.splice(0, 1)[0];

		for (const p of pieces) {
			// Syncing with the root, which is ok, and in that
			// case there's no sub-dir to create.
			if (!p && pieces.length === 1) return;

			const subPath = `${parent}/${p}`;
			await this.mkdir(subPath);
			parent = subPath;
		}
	}

	api() {
		return this.api_;
	}

	requestRepeatCount() {
		return 3;
	}

	metadataToStat_(md, path) {
		const output = {
			path: path,
			updated_time: md.updated_time,
			isDir: !!md.is_directory,
		};

		// TODO - HANDLE DELETED
		// if (md['.tag'] === 'deleted') output.isDeleted = true;

		return output;
	}

	metadataToStats_(mds) {
		const output = [];
		for (let i = 0; i < mds.length; i++) {
			output.push(this.metadataToStat_(mds[i], mds[i].name));
		}
		return output;
	}

	apiFilePath_(p) {
		if (p !== 'root') p += ':';
		return `api/files/${p}`;
	}

	async stat(path) {
		try {
			const response = await this.api().exec('GET', this.apiFilePath_(path));
			return this.metadataToStat_(response);
		} catch (error) {
			if (error.code === 404) return null;
			throw error;
		}
	}

	async delta(path, options) {
		const getDirStats = async (path) => {
			const result = await this.list(path);
			return result.items;
		};

		return basicDelta(path, getDirStats, options);
	}

	async list(path) {
		const results = await this.api().exec('GET', `${this.apiFilePath_(path)}/children`);

		return {
			items: this.metadataToStats_(results),
			hasMore: false, // TODO
			context: null,
		};
	}

	async get(path, options) {
		if (!options) options = {};
		if (!options.responseFormat) options.responseFormat = 'text';
		try {
			const response = await this.api().exec('GET', `${this.apiFilePath_(path)}/content`, null, null, options);
			return response;
		} catch (error) {
			if (error.code !== 404) throw error;
			return null;
		}
	}

	parentPath_(path) {
		let output = dirname(path);

		// This is the root or a special folder
		if (output.split('/').length === 1) {
			output = output.substr(0, output.length - 1);
		}

		return output;
	}

	basename_(path) {
		return basename(path);
	}

	async mkdir(path) {
		const parentPath = this.parentPath_(path);
		const filename = this.basename_(path);

		try {
			const response = await this.api().exec('POST', `${this.apiFilePath_(parentPath)}/children`, {
				name: filename,
				is_directory: 1,
			});
			return response;
		} catch (error) {
			// 409 is OK - directory already exists
			if (error.code !== 409) throw error;
		}
	}

	async put(path, content, options = null) {
		return this.api().exec('PUT', `${this.apiFilePath_(path)}/content`, content, null, options);
	}

	async delete(path) {
		return this.api().exec('DELETE', this.apiFilePath_(path));
	}

	format() {
		throw new Error('Not supported');
	}

	async clearRoot(path) {
		await this.delete(path);
		await this.mkdir(path);
	}
}

module.exports = { FileApiDriverJoplinServer };
