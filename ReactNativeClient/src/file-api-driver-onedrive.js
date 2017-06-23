import moment from 'moment';
import { time } from 'src/time-utils.js';
import { dirname, basename } from 'src/path-utils.js';
import { OneDriveApi } from 'src/onedrive-api.js';

class FileApiDriverOneDrive {

	constructor(clientId, clientSecret) {
		this.api_ = new OneDriveApi(clientId, clientSecret);
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

	async stat(path) {
		let item = null;
		try {
			item = await this.api_.execJson('GET', this.makePath_(path), this.itemFilter_());
		} catch (error) {
			if (error.error.code == 'itemNotFound') return null;
			throw error;
		}
		return this.makeItem_(item);
	}

	async setTimestamp(path, timestamp) {
		let body = {
			fileSystemInfo: {
				lastModifiedDateTime: moment.unix(timestamp / 1000).utc().format('YYYY-MM-DDTHH:mm:ss.SSS') + 'Z',
			}
		};
		await this.api_.exec('PATCH', this.makePath_(path), null, body);
	}

	async list(path) {
		let items = await this.api_.execJson('GET', this.makePath_(path) + ':/children', this.itemFilter_());
		return this.makeItems_(items.value);
	}

	async get(path) {
		let content = null;
		try {
			content = await this.api_.execText('GET', this.makePath_(path) + ':/content');
		} catch (error) {
			if (error.error.code == 'itemNotFound') return null;
			throw error;
		}
		return content;
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
		let newDir = dirname(newPath);
		let newName = basename(newPath);

		let item = await this.api_.execJson('PATCH', this.makePath_(oldPath), this.itemFilter_(), {
			name: newName,
			parentReference: { path: newDir },
		});

		return this.makeItem_(item);
	}

	format() {
		throw new Error('Not implemented');
	}

}

export { FileApiDriverOneDrive };