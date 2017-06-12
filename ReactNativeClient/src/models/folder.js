import { BaseModel } from 'src/base-model.js';
import { Log } from 'src/log.js';
import { promiseChain } from 'src/promise-chain.js';
import { Note } from 'src/models/note.js';
import { folderItemFilename } from 'src/string-utils.js'
import { _ } from 'src/locale.js';
import moment from 'moment';

class Folder extends BaseModel {

	static tableName() {
		return 'folders';
	}

	static filename(folder) {
		return folderItemFilename(folder);
	}

	static systemPath(parent, folder) {
		return this.filename(folder);
	}

	static systemMetadataPath(parent, folder) {
		return this.systemPath(parent, folder) + '/.folder.md';
	}

	// TODO: share with Note class
	static toFriendlyString_format(propName, propValue) {
		if (['created_time', 'updated_time'].indexOf(propName) >= 0) {
			if (!propValue) return '';
			propValue = moment.unix(propValue).format('YYYY-MM-DD hh:mm:ss');
		} else if (propValue === null || propValue === undefined) {
			propValue = '';
		}

		return propValue;
	}

	// TODO: share with Note class
	static toFriendlyString(folder) {
		let shownKeys = ['created_time', 'updated_time'];
		let output = [];

		output.push(folder.title);
		output.push('');
		output.push(''); // For consistency with the notes, leave an empty line where the body should be
		output.push('');
		for (let i = 0; i < shownKeys.length; i++) {
			let v = folder[shownKeys[i]];
			v = this.toFriendlyString_format(shownKeys[i], v);
			output.push(shownKeys[i] + ': ' + v);
		}

		return output.join("\n");
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
		return this.db().selectOne('SELECT * FROM notes WHERE `parent_id` = ? AND `' + field + '` = ?', [folderId, value]);
	}

	static all() {
		return this.db().selectAll('SELECT * FROM folders');
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