// A service that handle notes and folders in a uniform way

import { BaseService } from 'src/base-service.js';
import { BaseModel } from 'src/base-model.js';
import { Note } from 'src/models/note.js';
import { Folder } from 'src/models/folder.js';
import { Log } from 'src/log.js';
import { Registry } from 'src/registry.js';

class NoteFolderService extends BaseService {

	static save(type, item, oldItem) {
		if (oldItem) {
			let diff = BaseModel.diffObjects(oldItem, item);
			if (!Object.getOwnPropertyNames(diff).length) {
				Log.info('Item not changed - not saved');
				return Promise.resolve(item);
			}
		}

		let ItemClass = null;
		if (type == 'note') {
			ItemClass = Note;
		} else if (type == 'folder') {
			ItemClass = Folder;
		}

		let isNew = !item.id;
		let output = null;
		return ItemClass.save(item).then((item) => {
			output = item;
			if (isNew && type == 'note') return Note.updateGeolocation(item.id);
		}).then(() => {
			Registry.synchronizer().start();
			return output;
		});
	}

}

export { NoteFolderService };