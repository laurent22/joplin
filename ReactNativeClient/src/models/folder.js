import { BaseModel } from 'src/base-model.js';
import { Log } from 'src/log.js';
import { promiseChain } from 'src/promise-utils.js';
import { Note } from 'src/models/note.js';
import { folderItemFilename } from 'src/string-utils.js'
import { _ } from 'src/locale.js';
import moment from 'moment';
import { BaseItem } from 'src/models/base-item.js';

class Folder extends BaseItem {

	static tableName() {
		return 'folders';
	}

	static toFriendlyString(folder) {
		return super.toFriendlyString(folder, 'folder', ['id', 'created_time', 'updated_time']);
	}

	static itemType() {
		return BaseModel.ITEM_TYPE_FOLDER;
	}

	static trackChanges() {
		return true;
	}
	
	static newFolder() {
		return {
			id: null,
			title: '',
		}
	}

	static noteIds(id) {
		return this.db().selectAll('SELECT id FROM notes WHERE parent_id = ?', [id]).then((rows) => {			
			let output = [];
			for (let i = 0; i < rows.length; i++) {
				let row = rows[i];
				output.push(row.id);
			}
			return output;
		});
	}

	static delete(folderId, options = null) {
		return this.load(folderId).then((folder) => {
			if (!!folder.is_default) {
				throw new Error(_('Cannot delete the default list'));
			}
		}).then(() => {
			return this.noteIds(folderId);
		}).then((ids) => {
			let chain = [];
			for (let i = 0; i < ids.length; i++) {
				chain.push(() => {
					return Note.delete(ids[i]);
				});
			}

			return promiseChain(chain);
		}).then(() => {
			return super.delete(folderId, options);
		}).then(() => {
			this.dispatch({
				type: 'FOLDER_DELETE',
				folderId: folderId,
			});
		});
	}

	static loadNoteByField(folderId, field, value) {
		return this.modelSelectAll('SELECT * FROM notes WHERE `parent_id` = ? AND `' + field + '` = ?', [folderId, value]);
		//return this.db().selectOne('SELECT * FROM notes WHERE `parent_id` = ? AND `' + field + '` = ?', [folderId, value]);
	}

	static all() {
		return this.modelSelectAll('SELECT * FROM folders');
		// return this.db().selectAll('SELECT * FROM folders');
	}

	static save(o, options = null) {
		return Folder.loadByField('title', o.title).then((existingFolder) => {
			if (existingFolder && existingFolder.id != o.id) throw new Error(_('A folder with title "%s" already exists', o.title));

			return super.save(o, options).then((folder) => {
				this.dispatch({
					type: 'FOLDERS_UPDATE_ONE',
					folder: folder,
				});
				return folder;
			});
		});
	}

}

export { Folder };