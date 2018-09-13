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
		//lodash.pull(fieldNames, 'parent_id');
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

	static async subFolderIds(parentId) {
		const rows = await this.db().selectAll('SELECT id FROM folders WHERE parent_id = ?', [parentId]);
		return rows.map(r => r.id);
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

			let subFolderIds = await Folder.subFolderIds(folderId);
			for (let i = 0; i < subFolderIds.length; i++) {
				await Folder.delete(subFolderIds[i]);
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
			parent_id: '',
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

	static async childrenIds(folderId, recursive) {
		if (recursive === false) throw new Error('Not implemented');

		const folders = await this.db().selectAll('SELECT id FROM folders WHERE parent_id = ?', [folderId]);

		let output = [];

		for (let i = 0; i < folders.length; i++) {
			const f = folders[i];
			output.push(f.id);
			const subChildrenIds = await this.childrenIds(f.id, true);
			output = output.concat(subChildrenIds);
		}

		return output;
	}

	static async allAsTree(options = null) {
		const all = await this.all(options);

		// https://stackoverflow.com/a/49387427/561309
		function getNestedChildren(models, parentId) {
		    const nestedTreeStructure = [];
		    const length = models.length;

		    for (let i = 0; i < length; i++) {
		        const model = models[i];

		        if (model.parent_id == parentId) {
		            const children = getNestedChildren(models, model.id);

		            if (children.length > 0) {
		                model.children = children;
		            }

		            nestedTreeStructure.push(model);
		        }
		    }

		    return nestedTreeStructure;
		}

		return getNestedChildren(all, '');
	}

	static load(id) {
		if (id == this.conflictFolderId()) return this.conflictFolder();
		return super.load(id);
	}

	static defaultFolder() {
		return this.modelSelectOne('SELECT * FROM folders ORDER BY created_time DESC LIMIT 1');
	}

	static async canNestUnder(folderId, targetFolderId) {
		if (folderId === targetFolderId) return false;

		const conflictFolderId = Folder.conflictFolderId();
		if (folderId == conflictFolderId || targetFolderId == conflictFolderId) return false;

		if (!targetFolderId) return true;

		while (true) {
			let folder = await Folder.load(targetFolderId);
			if (!folder.parent_id) break;
			if (folder.parent_id === folderId) return false;
			targetFolderId = folder.parent_id;
		}

		return true;
	}

	static async moveToFolder(folderId, targetFolderId) {
		if (!(await this.canNestUnder(folderId, targetFolderId))) throw new Error(_('Cannot move notebook to this location'));

		// When moving a note to a different folder, the user timestamp is not updated.
		// However updated_time is updated so that the note can be synced later on.

		const modifiedFolder = {
			id: folderId,
			parent_id: targetFolderId,
			updated_time: time.unixMs(),
		};

		return Folder.save(modifiedFolder, { autoTimestamp: false });
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

		// We allow folders with duplicate titles so that folders with the same title can exist under different parent folder. For example:
		//
		// PHP
		//     Code samples
		//     Doc
		// Java
		//     My project
		//     Doc

		// if (options.duplicateCheck === true && o.title) {
		// 	let existingFolder = await Folder.loadByTitle(o.title);
		// 	if (existingFolder && existingFolder.id != o.id) throw new Error(_('A notebook with this title already exists: "%s"', o.title));
		// }

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