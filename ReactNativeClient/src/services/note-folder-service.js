// A service that handle notes and folders in a uniform way

import { BaseService } from 'src/base-service.js';
import { BaseModel } from 'src/base-model.js';
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

		// console.info(item);
		// console.info(oldItem);
		// console.info('DIFF', diff);
		// return Promise.resolve();


		let ItemClass = null;
		if (type == 'note') {
			ItemClass = Note;
		} else if (type == 'folder') {
			ItemClass = Folder;
		}

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

	static itemsThatNeedSync(context = null, limit = 100) {
		if (!context) {
			context = {
				hasMoreFolders: true,
				hasMoreNotes: true,
				noteOffset: 0,
				folderOffset: 0,
				hasMore: true,
			};
		}

		context.folderOffset = 0;
		context.noteOffset = 0;

		// Process folder first, then notes so that folders are created before
		// adding notes to them. However, it will be the opposite when deleting
		// folders (TODO).

		if (context.hasMoreFolders) {
			return BaseModel.db().selectAll('SELECT * FROM folders WHERE sync_time < updated_time LIMIT ' + limit + ' OFFSET ' + context.folderOffset).then((items) => {
				context.hasMoreFolders = items.length >= limit;
				context.folderOffset += items.length;
				return { context: context, items: items };
			});
		} else {
			return BaseModel.db().selectAll('SELECT * FROM notes WHERE sync_time < updated_time LIMIT ' + limit + ' OFFSET ' + context.noteOffset).then((items) => {
				context.hasMoreNotes = items.length >= limit;
				context.noteOffset += items.length;
				context.hasMore = context.hasMoreNotes;
				return { context: context, items: items };
			});
		}
	}

}

export { NoteFolderService };