import { BaseModel } from 'src/base-model.js';
import { Log } from 'src/log.js';
import { promiseChain } from 'src/promise-chain.js';
import { Note } from 'src/models/note.js';
import { _ } from 'src/locale.js';

class Folder extends BaseModel {

	static tableName() {
		return 'folders';
	}

	static useUuid() {
		return true;
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
		return this.db().exec('SELECT id FROM notes WHERE parent_id = ?', [id]).then((r) => {
			let output = [];
			for (let i = 0; i < r.rows.length; i++) {
				let row = r.rows.item(i);
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

	static all() {
		return this.db().selectAll('SELECT * FROM folders').then((r) => {
			let output = [];
			for (let i = 0; i < r.rows.length; i++) {
				output.push(r.rows.item(i));
			}
			return output;
		});
	}

	static save(o, options = null) {
		return super.save(o, options).then((folder) => {
			this.dispatch({
				type: 'FOLDERS_UPDATE_ONE',
				folder: folder,
			});
			return folder;
		});
	}

}

export { Folder };