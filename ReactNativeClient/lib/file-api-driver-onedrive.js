import moment from 'moment';
import { time } from 'lib/time-utils.js';
import { dirname, basename } from 'lib/path-utils.js';
import { OneDriveApi } from 'lib/onedrive-api.js';

class FileApiDriverOneDrive {

	constructor(api) {
		this.api_ = api;
	}

	api() {
		return this.api_;
	}

	supportsDelta() {
		return true;
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
		let output = {
			path: odItem.name,
			isDir: ('folder' in odItem),
		};

		if ('deleted' in odItem) {
			output.isDeleted = true;
		} else {
			output.created_time = moment(odItem.fileSystemInfo.createdDateTime, 'YYYY-MM-DDTHH:mm:ss.SSSZ').format('x');
			output.updated_time = moment(odItem.fileSystemInfo.lastModifiedDateTime, 'YYYY-MM-DDTHH:mm:ss.SSSZ').format('x');
		}

		return output;
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

	put(path, content, options = null) {
		if (!options) options = {};

		if (options.source == 'file') {
			return this.api_.exec('PUT', this.makePath_(path) + ':/content', null, null, options);
		} else {
			options.headers = { 'Content-Type': 'text/plain' };
			return this.api_.exec('PUT', this.makePath_(path) + ':/content', null, content, options);
		}
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

	async delta(path, options = null) {
		let output = {
			hasMore: false,
			context: {},
			items: [],
		};

		let context = options ? options.context : null;
		let url = context ? context.nextLink : null;
		let query = null;

		if (!url) {
			url = this.makePath_(path) + ':/delta';
			query = this.itemFilter_();
			query.select += ',deleted';
		}

		let response = await this.api_.execJson('GET', url, query);
		let items = this.makeItems_(response.value);
		output.items = output.items.concat(items);

		let nextLink = null;

		if (response['@odata.nextLink']) {
			nextLink = response['@odata.nextLink'];
			output.hasMore = true;
		} else {
			if (!response['@odata.deltaLink']) throw new Error('Delta link missing: ' + JSON.stringify(response));
			nextLink = response['@odata.deltaLink'];
		}

		output.context = { nextLink: nextLink };

		// https://dev.onedrive.com/items/view_delta.htm
		// The same item may appear more than once in a delta feed, for various reasons. You should use the last occurrence you see.
		// So remove any duplicate item from the array.
		let temp = [];
		let seenPaths = [];
		for (let i = output.items.length - 1; i >= 0; i--) {
			let item = output.items[i];
			if (seenPaths.indexOf(item.path) >= 0) continue;
			temp.splice(0, 0, item);
			seenPaths.push(item.path);
		}

		output.items = temp;

		return output;
	}

}

export { FileApiDriverOneDrive };