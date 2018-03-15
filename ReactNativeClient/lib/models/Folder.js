const BaseModel = require('lib/BaseModel.js');
const { promiseChain } = require('lib/promise-utils.js');
const { time } = require('lib/time-utils.js');
const Note = require('lib/models/Note.js');
const Setting = require('lib/models/Setting.js');
const { Database } = require('lib/database.js');
const { _ } = require('lib/locale.js');
const moment = require('moment');
const BaseItem = require('lib/models/BaseItem.js');
const lodash = require('lodash');

class Folder extends BaseItem {

	static tableName() {
		return 'folders';
	}

	static async serialize(folder) {
		let fieldNames = this.fieldNames();
		fieldNames.push('type_');
		lodash.pull(fieldNames, 'parent_id');
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

	static async findUniqueFolderTitle(title) {
		let counter = 1;
		let titleToTry = title;
		while (true) {
			const folder = await this.loadByField('title', titleToTry);
			if (!folder) return titleToTry;
			titleToTry = title + ' (' + counter + ')';
			counter++;
			if (counter >= 100) titleToTry = title + ' (' + ((new Date()).getTime()) + ')';
			if (counter >= 1000) throw new Error('Cannot find unique title');
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

	static async noteCount(parentId) {
		let r = await this.db().selectOne('SELECT count(*) as total FROM notes WHERE is_conflict = 0 AND parent_id = ?', [parentId]);
		return r ? r.total : 0;
	}

	static markNotesAsConflict(parentId) {
		let query = Database.updateQuery('notes', { is_conflict: 1 }, { parent_id: parentId });
		return this.db().exec(query);
	}

	static async delete(folderId, options = null) {
		if (!options) options = {};
		if (!('deleteChildren' in options)) options.deleteChildren = true;

		let folder = await Folder.load(folderId);
		if (!folder) return; // noop

		if (options.deleteChildren) {		
			let noteIds = await Folder.noteIds(folderId);
			for (let i = 0; i < noteIds.length; i++) {
				await Note.delete(noteIds[i]);
			}
		}

		await super.delete(folderId, options);

		this.dispatch({
			type: 'FOLDER_DELETE',
			id: folderId,
		});
	}

	static conflictFolderTitle() {
		return _('Conflicts');
	}

	static conflictFolderId() {
		return 'c04f1c7c04f1c7c04f1c7c04f1c7c04f';
	}

	static conflictFolder() {
		return {
			type_: this.TYPE_FOLDER,
			id: this.conflictFolderId(),
			title: this.conflictFolderTitle(),
			updated_time: time.unixMs(),
			user_updated_time: time.unixMs(),
		};
	}

	static async all(options = null) {
		let output = await super.all(options);
		if (options && options.includeConflictFolder) {
			let conflictCount = await Note.conflictedCount();
			if (conflictCount) output.push(this.conflictFolder());
		}
		return output;
	}

	static load(id) {
		if (id == this.conflictFolderId()) return this.conflictFolder();
		return super.load(id);
	}

	static defaultFolder() {
		return this.modelSelectOne('SELECT * FROM folders ORDER BY created_time DESC LIMIT 1');
	}

	// These "duplicateCheck" and "reservedTitleCheck" should only be done when a user is
	// manually creating a folder. They shouldn't be done for example when the folders
	// are being synced to avoid any strange side-effects. Technically it's possible to 
	// have folders and notes with duplicate titles (or no title), or with reserved words.
	static async save(o, options = null) {
		if (!options) options = {};

		if (options.userSideValidation === true) {
			if (!('duplicateCheck' in options)) options.duplicateCheck = true;
			if (!('reservedTitleCheck' in options)) options.reservedTitleCheck = true;
			if (!('stripLeftSlashes' in options)) options.stripLeftSlashes = true;			
		}

		if (options.stripLeftSlashes === true && o.title) {
			while (o.title.length && (o.title[0] == '/' || o.title[0] == "\\")) {
				o.title = o.title.substr(1);
			}
		}

		if (options.duplicateCheck === true && o.title) {
			let existingFolder = await Folder.loadByTitle(o.title);
			if (existingFolder && existingFolder.id != o.id) throw new Error(_('A notebook with this title already exists: "%s"', o.title));
		}

		if (options.reservedTitleCheck === true && o.title) {
			if (o.title == Folder.conflictFolderTitle()) throw new Error(_('Notebooks cannot be named "%s", which is a reserved title.', o.title));
		}

		return super.save(o, options).then((folder) => {
			this.dispatch({
				type: 'FOLDER_UPDATE_ONE',
				item: folder,
			});
			return folder;
		});
	}

}

module.exports = Folder;