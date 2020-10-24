const { time } = require('lib/time-utils.js');
const fs = require('fs-extra');
const { basicDelta } = require('lib/file-api');

class FileApiDriverMemory {
	constructor() {
		this.items_ = [];
		this.deletedItems_ = [];
	}

	encodeContent_(content) {
		if (content instanceof Buffer) {
			return content.toString('base64');
		} else {
			return Buffer.from(content).toString('base64');
		}
	}

	decodeContent_(content) {
		return Buffer.from(content, 'base64').toString('utf-8');
	}

	itemIndexByPath(path) {
		for (let i = 0; i < this.items_.length; i++) {
			if (this.items_[i].path == path) return i;
		}
		return -1;
	}

	itemByPath(path) {
		const index = this.itemIndexByPath(path);
		return index < 0 ? null : this.items_[index];
	}

	newItem(path, isDir = false) {
		const now = time.unixMs();
		return {
			path: path,
			isDir: isDir,
			updated_time: now, // In milliseconds!!
			// created_time: now, // In milliseconds!!
			content: '',
		};
	}

	stat(path) {
		const item = this.itemByPath(path);
		return Promise.resolve(item ? Object.assign({}, item) : null);
	}

	async setTimestamp(path, timestampMs) {
		const item = this.itemByPath(path);
		if (!item) return Promise.reject(new Error(`File not found: ${path}`));
		item.updated_time = timestampMs;
	}

	async list(path) {
		const output = [];

		for (let i = 0; i < this.items_.length; i++) {
			const item = this.items_[i];
			if (item.path == path) continue;
			if (item.path.indexOf(`${path}/`) === 0) {
				const s = item.path.substr(path.length + 1);
				if (s.split('/').length === 1) {
					const it = Object.assign({}, item);
					it.path = it.path.substr(path.length + 1);
					output.push(it);
				}
			}
		}

		return Promise.resolve({
			items: output,
			hasMore: false,
			context: null,
		});
	}

	async get(path, options) {
		const item = this.itemByPath(path);
		if (!item) return Promise.resolve(null);
		if (item.isDir) return Promise.reject(new Error(`${path} is a directory, not a file`));

		let output = null;
		if (options.target === 'file') {
			await fs.writeFile(options.path, Buffer.from(item.content, 'base64'));
		} else {
			const content = this.decodeContent_(item.content);
			output = Promise.resolve(content);
		}

		return output;
	}

	async mkdir(path) {
		const index = this.itemIndexByPath(path);
		if (index >= 0) return;
		this.items_.push(this.newItem(path, true));
	}

	async put(path, content, options = null) {
		if (!options) options = {};

		if (options.source === 'file') content = await fs.readFile(options.path);

		const index = this.itemIndexByPath(path);
		if (index < 0) {
			const item = this.newItem(path, false);
			item.content = this.encodeContent_(content);
			this.items_.push(item);
		} else {
			this.items_[index].content = this.encodeContent_(content);
			this.items_[index].updated_time = time.unixMs();
		}
	}

	async delete(path) {
		const index = this.itemIndexByPath(path);
		if (index >= 0) {
			const item = Object.assign({}, this.items_[index]);
			item.isDeleted = true;
			item.updated_time = time.unixMs();
			this.deletedItems_.push(item);
			this.items_.splice(index, 1);
		}
	}

	async move(oldPath, newPath) {
		const sourceItem = this.itemByPath(oldPath);
		if (!sourceItem) return Promise.reject(new Error(`Path not found: ${oldPath}`));
		this.delete(newPath); // Overwrite if newPath already exists
		sourceItem.path = newPath;
	}

	async format() {
		this.items_ = [];
	}

	async delta(path, options = null) {
		const getStatFn = async path => {
			const output = this.items_.slice();
			for (let i = 0; i < output.length; i++) {
				const item = Object.assign({}, output[i]);
				item.path = item.path.substr(path.length + 1);
				output[i] = item;
			}
			return output;
		};

		const output = await basicDelta(path, getStatFn, options);
		return output;
	}

	async clearRoot() {
		this.items_ = [];
	}
}

module.exports = { FileApiDriverMemory };
