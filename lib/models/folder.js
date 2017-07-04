import { BaseModel } from 'lib/base-model.js';
import { Log } from 'lib/log.js';
import { promiseChain } from 'lib/promise-utils.js';
import { Note } from 'lib/models/note.js';
import { Setting } from 'lib/models/setting.js';
import { _ } from 'lib/locale.js';
import moment from 'moment';
import { BaseItem } from 'lib/models/base-item.js';
import lodash from 'lodash';

class Folder extends BaseItem {

	static tableName() {
		return 'folders';
	}

	static async serialize(folder) {
		let fieldNames = this.fieldNames();
		fieldNames.push('type_');
		lodash.pull(fieldNames, 'parent_id', 'sync_time');
		return super.serialize(folder, 'folder', fieldNames);
	}

	static modelType() {
		return BaseModel.TYPE_FOLDER;
	}
	
	static newFolder() {
		return {
			id: null,
			title: '',
		}
	}

	static noteIds(parentId) {
		return this.db().selectAll('SELECT id FROM notes WHERE is_conflict = 0 AND parent_id = ?', [parentId]).then((rows) => {			
			let output = [];
			for (let i = 0; i < rows.length; i++) {
				let row = rows[i];
				output.push(row.id);
			}
			return output;
		});
	}

	static async delete(folderId, options = null) {
		let folder = await Folder.load(folderId);
		if (!folder) throw new Error('Trying to delete non-existing notebook: ' + folderId);
		
		let noteIds = await Folder.noteIds(folderId);
		for (let i = 0; i < noteIds.length; i++) {
			await Note.delete(noteIds[i]);
		}

		await super.delete(folderId, options);

		this.dispatch({
			type: 'FOLDER_DELETE',
			folderId: folderId,
		});
	}

	static async all(options = null) {
		if (!options) options = {};

		let folders = await super.all(options);
		if (!options.includeNotes) return folders;

		if (options.limit) options.limit -= folders.length;

		let notes = await Note.all(options);
		return folders.concat(notes);
	}

	static defaultFolder() {
		return this.modelSelectOne('SELECT * FROM folders ORDER BY created_time DESC LIMIT 1');
	}

	static async save(o, options = null) {
		if (options && options.duplicateCheck === true && o.title) {
			let existingFolder = await Folder.loadByTitle(o.title);
			if (existingFolder) throw new Error(_('A notebook with this title already exists: "%s"', o.title));
		}

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