import moment from 'moment';
import { time } from 'lib/time-utils.js';
import { dirname, basename } from 'lib/path-utils.js';
import { OneDriveApi } from 'lib/onedrive-api.js';

class FileApiDriverOneDrive {

	constructor(api) {
		this.api_ = api;
	}

	syncTargetId() {
		return 3;
	}

	syncTargetName() {
		return 'onedrive';
	}

	api() {
		return this.api_;
	}

	itemFilter_() {
		return {
			select: 'name,file,folder,fileSystemInfo',
		}
	}

	makePath_(path) {
		return path;
	}

	makeItems_(odItems) {
		let output = [];
		for (let i = 0; i < odItems.length; i++) {
			output.push(this.makeItem_(odItems[i]));
		}
		return output;
	}

	makeItem_(odItem) {
		return {
			path: odItem.name,
			isDir: ('folder' in odItem),
			created_time: moment(odItem.fileSystemInfo.createdDateTime, 'YYYY-MM-DDTHH:mm:ss.SSSZ').format('x'),
			updated_time: moment(odItem.fileSystemInfo.lastModifiedDateTime, 'YYYY-MM-DDTHH:mm:ss.SSSZ').format('x'),
		};
	}

	async statRaw_(path) {
		let item = null;
		try {
			item = await this.api_.execJson('GET', this.makePath_(path), this.itemFilter_());
		} catch (error) {
			if (error.code == 'itemNotFound') return null;
			throw error;
		}
		return item;
	}

	async stat(path) {
		let item = await this.statRaw_(path);
		if (!item) return null;
		return this.makeItem_(item);
	}

	async setTimestamp(path, timestamp) {
		let body = {
			fileSystemInfo: {
				lastModifiedDateTime: moment.unix(timestamp / 1000).utc().format('YYYY-MM-DDTHH:mm:ss.SSS') + 'Z',
			}
		};
		let item = await this.api_.execJson('PATCH', this.makePath_(path), null, body);
		return this.makeItem_(item);
	}

	async list(path, options = null) {
		let query = this.itemFilter_();
		let url = this.makePath_(path) + ':/children';

		if (options.context) {
			query = null;
			url = options.context;
		}

		let r = await this.api_.execJson('GET', url, query);

		return {
			hasMore: !!r['@odata.nextLink'],
			items: this.makeItems_(r.value),
			context: r["@odata.nextLink"],
		}
	}

	async get(path, options = null) {
		if (!options) options = {};

		try {
			if (options.target == 'file') {
				let response = await this.api_.exec('GET', this.makePath_(path) + ':/content', null, null, options);
				return response;
			} else {
				let content = await this.api_.execText('GET', this.makePath_(path) + ':/content');
				return content;
			}
		} catch (error) {
			if (error.code == 'itemNotFound') return null;
			throw error;
		}
	}

	async mkdir(path) {
		let item = await this.stat(path);
		if (item) return item;

		let parentPath = dirname(path);
		item = await this.api_.execJson('POST', this.makePath_(parentPath) + ':/children', this.itemFilter_(), {
			name: basename(path),
			folder: {},
		});

		return this.makeItem_(item);
	}

	put(path, content) {
		let options = {
			headers: { 'Content-Type': 'text/plain' },
		};
		return this.api_.exec('PUT', this.makePath_(path) + ':/content', null, content, options);
	}

	delete(path) {
		return this.api_.exec('DELETE', this.makePath_(path));
	}

	async move(oldPath, newPath) {
		// Cannot work in an atomic way because if newPath already exist, the OneDrive API throw an error
		// "An item with the same name already exists under the parent". Some posts suggest to use
		// @name.conflictBehavior [0]but that doesn't seem to work. So until Microsoft fixes this
		// it's not possible to do an atomic move.
		//
		// [0] https://stackoverflow.com/questions/29191091/onedrive-api-overwrite-on-move
		throw new Error('NOT WORKING');

		let previousItem = await this.statRaw_(oldPath);

		let newDir = dirname(newPath);
		let newName = basename(newPath);

		// We don't want the modification date to change when we move the file so retrieve it
		// now set it in the PATCH operation.		

		let item = await this.api_.execJson('PATCH', this.makePath_(oldPath), this.itemFilter_(), {
			name: newName,
			parentReference: { path: newDir },
			fileSystemInfo: {
				lastModifiedDateTime: previousItem.fileSystemInfo.lastModifiedDateTime,
			},
		});

		return this.makeItem_(item);
	}

	format() {
		throw new Error('Not implemented');
	}

}

export { FileApiDriverOneDrive };