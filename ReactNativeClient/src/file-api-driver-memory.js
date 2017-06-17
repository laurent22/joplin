import { time } from 'src/time-utils.js';

class FileApiDriverMemory {

	constructor(baseDir) {
		this.items_ = [];
	}

	currentTimestamp() {
		return Math.round((new Date()).getTime() / 1000);
	}

	itemIndexByPath(path) {
		for (let i = 0; i < this.items_.length; i++) {
			if (this.items_[i].path == path) return i;
		}
		return -1;
	}

	itemByPath(path) {
		let index = this.itemIndexByPath(path);
		return index < 0 ? null : this.items_[index];
	}

	newItem(path, isDir = false) {
		let now = time.unix();
		return {
			path: path,
			isDir: isDir,
			updatedTime: now,
			createdTime: now,
			content: '',
		};
	}

	stat(path) {
		let item = this.itemByPath(path);
		return Promise.resolve(item ? Object.assign({}, item) : null);
	}

	setTimestamp(path, timestamp) {
		let item = this.itemByPath(path);
		if (!item) return Promise.reject(new Error('File not found: ' + path));
		item.updatedTime = timestamp;
		return Promise.resolve();
	}

	list(path) {
		let output = [];

		for (let i = 0; i < this.items_.length; i++) {
			let item = this.items_[i];
			if (item.path == path) continue;
			if (item.path.indexOf(path + '/') === 0) {
				let s = item.path.substr(path.length + 1);
				if (s.split('/').length === 1) {
					let it = Object.assign({}, item);
					output.push(it);
				}
			}
		}

		return Promise.resolve(output);
	}

	get(path) {
		let item = this.itemByPath(path);
		if (!item) return Promise.resolve(null);
		if (item.isDir) return Promise.reject(new Error(path + ' is a directory, not a file'));
		return Promise.resolve(item.content);
	}

	mkdir(path) {
		let index = this.itemIndexByPath(path);
		if (index >= 0) return Promise.resolve();
		this.items_.push(this.newItem(path, true));
		return Promise.resolve();
	}

	put(path, content) {
		let index = this.itemIndexByPath(path);
		if (index < 0) {
			let item = this.newItem(path, false);
			item.content = content;
			this.items_.push(item);
		} else {
			this.items_[index].content = content;
			this.items_[index].updatedTime = time.unix();
		}
		return Promise.resolve();
	}

	delete(path) {
		let index = this.itemIndexByPath(path);
		if (index >= 0) {
			this.items_.splice(index, 1);
		}
		return Promise.resolve();
	}

	move(oldPath, newPath) {
		let sourceItem = this.itemByPath(oldPath);
		if (!sourceItem) return Promise.reject(new Error('Path not found: ' + oldPath));
		this.delete(newPath); // Overwrite if newPath already exists
		sourceItem.path = newPath;
		return Promise.resolve();
	}

	format() {
		this.items_ = [];
		return Promise.resolve();
	}

}

export { FileApiDriverMemory };