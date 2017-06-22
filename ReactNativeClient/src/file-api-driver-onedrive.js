import moment from 'moment';
import { time } from 'src/time-utils.js';
import { OneDriveApi } from 'src/onedrive-api.js';

class FileApiDriverOneDrive {

	constructor(token) {
		this.api_ = new OneDriveApi('e09fc0de-c958-424f-83a2-e56a721d331b');
		this.api_.setToken(token);
	}

	listReturnsFullPath() {
		return false;
	}

	itemFilter_() {
		return {
			select: 'name,file,folder,fileSystemInfo',
		}
	}

	makePath_(path) {
		return '/drive/root:' + path;
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
		let item = await this.api_.execJson('GET', this.makePath_(path), this.itemFilter_());
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

	get(path) {
		return this.api_.execText('GET', this.makePath_(path) + ':/content');
	}

	mkdir(path) {
		throw new Error('Not implemented');
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

	move(oldPath, newPath) {
		throw new Error('Not implemented');
	}

	format() {
		throw new Error('Not implemented');
	}

}

export { FileApiDriverOneDrive };