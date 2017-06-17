// A service that handle notes and folders in a uniform way

import { BaseService } from 'src/base-service.js';
import { BaseModel } from 'src/base-model.js';
import { BaseItem } from 'src/models/base-item.js';
import { Note } from 'src/models/note.js';
import { Folder } from 'src/models/folder.js';
import { Log } from 'src/log.js';
import { time } from 'src/time-utils.js';
import { Registry } from 'src/registry.js';

class NoteFolderService extends BaseService {

	static save(type, item, oldItem) {
		let diff = null;
		if (oldItem) {
			diff = BaseModel.diffObjects(oldItem, item);
			if (!Object.getOwnPropertyNames(diff).length) {
				Log.info('Item not changed - not saved');
				return Promise.resolve(item);
			}
		}

		let ItemClass = BaseItem.itemClass(item);

		let isNew = !item.id;
		let output = null;

		let toSave = item;
		if (diff !== null) {
			toSave = diff;
			toSave.id = item.id;
		}

		return ItemClass.save(toSave).then((savedItem) => {
			output = Object.assign(item, savedItem);
			if (isNew && type == 'note') return Note.updateGeolocation(output.id);
		}).then(() => {
//			Registry.synchronizer().start();
			return output;
		});
	}

	// static setField(type, itemId, fieldName, fieldValue, oldValue = undefined) {
	// 	// TODO: not really consistent as the promise will return 'null' while
	// 	// this.save will return the note or folder. Currently not used, and maybe not needed.
	// 	if (oldValue !== undefined && fieldValue === oldValue) return Promise.resolve();

	// 	let item = { id: itemId };
	// 	item[fieldName] = fieldValue;
	// 	let oldItem = { id: itemId };
	// 	return this.save(type, item, oldItem);
	// }

	static openNoteList(folderId) {
		return Note.previews(folderId).then((notes) => {
			this.dispatch({
				type: 'NOTES_UPDATE_ALL',
				notes: notes,
			});

			this.dispatch({
				type: 'Navigation/NAVIGATE',
				routeName: 'Notes',
				folderId: folderId,
			});
		}).catch((error) => {
			Log.warn('Cannot load notes', error);
		});
	}

	static itemsThatNeedSync(limit = 100) {
		// Process folder first, then notes so that folders are created before
		// adding notes to them. However, it will be the opposite when deleting
		// folders (TODO).

		function getFolders(limit) {
			return Folder.modelSelectAll('SELECT * FROM folders WHERE sync_time < updated_time LIMIT ' + limit);
			//return BaseModel.db().selectAll('SELECT * FROM folders WHERE sync_time < updated_time LIMIT ' + limit);
		}

		function getNotes(limit) {
			return Note.modelSelectAll('SELECT * FROM notes WHERE sync_time < updated_time LIMIT ' + limit);
			//return BaseModel.db().selectAll('SELECT * FROM notes WHERE sync_time < updated_time LIMIT ' + limit);
		}

		return getFolders(limit).then((items) => {
			if (items.length) return { hasMore: true, items: items };
			return getNotes(limit).then((items) => {
				return { hasMore: items.length >= limit, items: items };
			});
		});
	}

}

export { NoteFolderService };