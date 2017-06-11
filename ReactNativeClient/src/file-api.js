import { promiseChain } from 'src/promise-chain.js';

class FileApi {

	constructor(baseDir, driver) {
		this.baseDir_ = baseDir;
		this.driver_ = driver;
	}

	list(path, recursive = false) {
		return this.driver_.list(this.baseDir_ + '/' + path, recursive).then((items) => {
			if (recursive) {
				let chain = [];
				for (let i = 0; i < items.length; i++) {
					let item = items[i];
					if (!item.isDir) continue;

					chain.push(() => {
						return this.list(path + '/' + item.name, true).then((children) => {
							for (let j = 0; j < children.length; j++) {
								let md = children[j];
								md.name = item.name + '/' + md.name; 
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

	mkdir(path) {
		return this.driver_.mkdir(this.baseDir_ + '/' + path);
	}

	get(path) {
		return this.driver_.get(this.baseDir_ + '/' + path);
	}

	put(path, content) {
		return this.driver_.put(this.baseDir_ + '/' + path, content);
	}

	delete(path) {
		return this.driver_.delete(this.baseDir_ + '/' + path);
	}

	move(oldPath, newPath) {
		return this.driver_.move(this.baseDir_ + '/' + oldPath, this.baseDir_ + '/' + newPath);
	}

}

export { FileApi };