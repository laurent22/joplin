import { isHidden } from 'src/path-utils.js';

class FileApi {

	constructor(baseDir, driver) {
		this.baseDir_ = baseDir;
		this.driver_ = driver;
	}

	dlog(s) {
		console.info('FileApi: ' + s);
	}

	fullPath_(path) {
		let output = this.baseDir_;
		if (path != '') output += '/' + path;
		return output;
	}

	list(path = '', options = null) {
		if (!options) options = {};
		if (!('includeHidden' in options)) options.includeHidden = false;

		this.dlog('list');
		return this.driver_.list(this.baseDir_).then((items) => {
			if (!options.includeHidden) {
				let temp = [];
				for (let i = 0; i < items.length; i++) {
					if (!isHidden(items[i].path)) temp.push(items[i]);
				}
				items = temp;
			}
			return items;
		});
	}

	setTimestamp(path, timestamp) {
		this.dlog('setTimestamp ' + path);
		return this.driver_.setTimestamp(this.fullPath_(path), timestamp);
	}

	mkdir(path) {
		this.dlog('delete ' + path);
		return this.driver_.mkdir(this.fullPath_(path));
	}

	stat(path) {
		this.dlog('stat ' + path);
		return this.driver_.stat(this.fullPath_(path)).then((output) => {
			if (!output) return output;
			output.path = path;
			return output;
		});
	}

	get(path) {
		this.dlog('get ' + path);
		return this.driver_.get(this.fullPath_(path));
	}

	put(path, content) {
		this.dlog('put ' + path);
		return this.driver_.put(this.fullPath_(path), content);
	}

	delete(path) {
		this.dlog('delete ' + path);
		return this.driver_.delete(this.fullPath_(path));
	}

	move(oldPath, newPath) {
		this.dlog('move ' + oldPath + ' => ' + newPath);
		return this.driver_.move(this.fullPath_(oldPath), this.fullPath_(newPath));
	}

	format() {
		return this.driver_.format();
	}

}

export { FileApi };