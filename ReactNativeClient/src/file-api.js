import { promiseChain } from 'src/promise-chain.js';

class FileApi {

	constructor(baseDir, driver) {
		this.baseDir_ = baseDir;
		this.driver_ = driver;
	}

	fullPath_(path) {
		let output = this.baseDir_;
		if (path != '') output += '/' + path;
		return output;
	}

	list(path = '', recursive = false) {
		let fullPath = this.fullPath_(path);
		return this.driver_.list(fullPath, recursive).then((items) => {
			if (recursive) {
				let chain = [];
				for (let i = 0; i < items.length; i++) {
					let item = items[i];
					if (!item.isDir) continue;

					chain.push(() => {
						return this.list(item.path, true).then((children) => {
							for (let j = 0; j < children.length; j++) {
								let md = children[j];
								md.path = item.path + '/' + md.path; 
								items.push(md);
							}
						});
					});
				}

				return promiseChain(chain).then(() => {
					return items;
				});
			} else {
				return items;
			}
		});
	}

	setTimestamp(path, timestamp) {
		return this.driver_.setTimestamp(this.fullPath_(path), timestamp);
	}

	mkdir(path) {
		return this.driver_.mkdir(this.fullPath_(path));
	}

	get(path) {
		return this.driver_.get(this.fullPath_(path));
	}

	put(path, content) {
		return this.driver_.put(this.fullPath_(path), content);
	}

	delete(path) {
		return this.driver_.delete(this.fullPath_(path));
	}

	move(oldPath, newPath) {
		return this.driver_.move(this.fullPath_(oldPath), this.fullPath_(newPath));
	}

	format() {
		return this.driver_.format();
	}

}

export { FileApi };