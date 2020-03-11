const BaseModel = require('lib/BaseModel.js');
const { time } = require('lib/time-utils.js');
const Note = require('lib/models/Note.js');
const { Database } = require('lib/database.js');
const { _ } = require('lib/locale.js');
const BaseItem = require('lib/models/BaseItem.js');
const { substrWithEllipsis } = require('lib/string-utils.js');

class Folder extends BaseItem {
	static tableName() {
		return 'folders';
	}

	static modelType() {
		return BaseModel.TYPE_FOLDER;
	}

	static newFolder() {
		return {
			id: null,
			title: '',
		};
	}

	static fieldToLabel(field) {
		const fieldsToLabels = {
			title: _('title'),
			last_note_user_updated_time: _('updated date'),
		};

		return field in fieldsToLabels ? fieldsToLabels[field] : field;
	}

	static noteIds(parentId) {
		return this.db()
			.selectAll('SELECT id FROM notes WHERE is_conflict = 0 AND parent_id = ?', [parentId])
			.then(rows => {
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

	// Calculates note counts for all folders and adds the note_count attribute to each folder
	// Note: this only calculates the overall number of nodes for this folder and all its descendants
	static async addNoteCounts(folders, includeCompletedTodos = true) {
		const foldersById = {};
		folders.forEach((f) => {
			foldersById[f.id] = f;
			f.note_count = 0;
		});

		const where = !includeCompletedTodos ? 'WHERE (notes.is_todo = 0 OR notes.todo_completed = 0)' : '';

		const sql = `SELECT folders.id as folder_id, count(notes.parent_id) as note_count 
			FROM folders LEFT JOIN notes ON notes.parent_id = folders.id
			${where} GROUP BY folders.id`;

		const noteCounts = await this.db().selectAll(sql);
		noteCounts.forEach((noteCount) => {
			let parentId = noteCount.folder_id;
			do {
				let folder = foldersById[parentId];
				if (!folder) break; // https://github.com/laurent22/joplin/issues/2079
				folder.note_count = (folder.note_count || 0) + noteCount.note_count;
				parentId = folder.parent_id;
			} while (parentId);
		});
	}

	// Folders that contain notes that have been modified recently go on top.
	// The remaining folders, that don't contain any notes are sorted by their own user_updated_time
	static async orderByLastModified(folders, dir = 'DESC') {
		dir = dir.toUpperCase();
		const sql = 'select parent_id, max(user_updated_time) content_updated_time from notes where parent_id != "" group by parent_id';
		const rows = await this.db().selectAll(sql);

		const folderIdToTime = {};
		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			folderIdToTime[row.parent_id] = row.content_updated_time;
		}

		const findFolderParent = folderId => {
			const folder = BaseModel.byId(folders, folderId);
			if (!folder) return null; // For the rare case of notes that are associated with a no longer existing folder
			if (!folder.parent_id) return null;
			for (let i = 0; i < folders.length; i++) {
				if (folders[i].id === folder.parent_id) return folders[i];
			}

			// In some rare cases, some folders may not have a parent, for example
			// if it has not been downloaded via sync yet.
			// https://github.com/laurent22/joplin/issues/2088
			return null;
		};

		const applyChildTimeToParent = folderId => {
			const parent = findFolderParent(folderId);
			if (!parent) return;

			if (folderIdToTime[parent.id] && folderIdToTime[parent.id] >= folderIdToTime[folderId]) {
				// Don't change so that parent has the same time as the last updated child
			} else {
				folderIdToTime[parent.id] = folderIdToTime[folderId];
			}

			applyChildTimeToParent(parent.id);
		};

		for (let folderId in folderIdToTime) {
			if (!folderIdToTime.hasOwnProperty(folderId)) continue;
			applyChildTimeToParent(folderId);
		}

		const mod = dir === 'DESC' ? +1 : -1;
		const output = folders.slice();
		output.sort((a, b) => {
			const aTime = folderIdToTime[a.id] ? folderIdToTime[a.id] : a.user_updated_time;
			const bTime = folderIdToTime[b.id] ? folderIdToTime[b.id] : b.user_updated_time;

			if (aTime < bTime) return +1 * mod;
			if (aTime > bTime) return -1 * mod;

			return 0;
		});

		return output;
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

	static async expandTree(folders, parentId) {
		const folderPath = await this.folderPath(folders, parentId);
		for (const folder of folderPath) {
			this.dispatch({
				type: 'FOLDER_SET_COLLAPSED',
				id: folder.id,
				collapsed: false,
			});
		}
	}

	static async allAsTree(folders = null, options = null) {
		const all = folders ? folders : await this.all(options);

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

	static folderPath(folders, folderId) {
		const idToFolders = {};
		for (let i = 0; i < folders.length; i++) {
			idToFolders[folders[i].id] = folders[i];
		}

		const path = [];
		while (folderId) {
			const folder = idToFolders[folderId];
			if (!folder) break; // Shouldn't happen
			path.push(folder);
			folderId = folder.parent_id;
		}

		path.reverse();

		return path;
	}

	static folderPathString(folders, folderId, maxTotalLength = 80) {
		const path = this.folderPath(folders, folderId);

		let currentTotalLength = 0;
		for (let i = 0; i < path.length; i++) {
			currentTotalLength += path[i].title.length;
		}

		let pieceLength = maxTotalLength;
		if (currentTotalLength > maxTotalLength) {
			pieceLength = maxTotalLength / path.length;
		}

		const output = [];
		for (let i = 0; i < path.length; i++) {
			output.push(substrWithEllipsis(path[i].title, 0, pieceLength));
		}

		return output.join(' / ');
	}

	static buildTree(folders) {
		const idToFolders = {};
		for (let i = 0; i < folders.length; i++) {
			idToFolders[folders[i].id] = folders[i];
			idToFolders[folders[i].id].children = [];
		}

		const rootFolders = [];
		for (let folderId in idToFolders) {
			if (!idToFolders.hasOwnProperty(folderId)) continue;

			const folder = idToFolders[folderId];
			if (!folder.parent_id) {
				rootFolders.push(folder);
			} else {
				if (!idToFolders[folder.parent_id]) {
					// It means the notebook is refering a folder that doesn't exist. In theory it shouldn't happen
					// but sometimes does - https://github.com/laurent22/joplin/issues/1068#issuecomment-450594708
					rootFolders.push(folder);
				} else {
					idToFolders[folder.parent_id].children.push(folder);
				}
			}
		}

		return rootFolders;
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
			while (o.title.length && (o.title[0] == '/' || o.title[0] == '\\')) {
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

		return super.save(o, options).then(folder => {
			this.dispatch({
				type: 'FOLDER_UPDATE_ONE',
				item: folder,
			});
			return folder;
		});
	}
}

module.exports = Folder;
