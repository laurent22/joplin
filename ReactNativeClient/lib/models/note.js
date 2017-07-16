import { BaseModel } from 'lib/base-model.js';
import { Log } from 'lib/log.js';
import { Folder } from 'lib/models/folder.js';
import { BaseItem } from 'lib/models/base-item.js';
import { Setting } from 'lib/models/setting.js';
import { shim } from 'lib/shim.js';
import { time } from 'lib/time-utils.js';
import { _ } from 'lib/locale.js';
import moment from 'moment';
import lodash  from 'lodash';

class Note extends BaseItem {

	static tableName() {
		return 'notes';
	}

	static async serialize(note, type = null, shownKeys = null) {
		let fieldNames = this.fieldNames();
		fieldNames.push('type_');
		return super.serialize(note, 'note', fieldNames);
	}

	static async serializeForEdit(note) {
		return super.serialize(note, 'note', ['title', 'body']);
	}

	static async unserializeForEdit(content) {
		content += "\n\ntype_: " + BaseModel.TYPE_NOTE;
		let output = await super.unserialize(content);
		if (!output.title) output.title = '';
		if (!output.body) output.body = '';
		return output;
	}

	static async serializeAllProps(note) {
		let fieldNames = this.fieldNames();
		fieldNames.push('type_');
		lodash.pull(fieldNames, 'title', 'body');
		return super.serialize(note, 'note', fieldNames);
	}

	static modelType() {
		return BaseModel.TYPE_NOTE;
	}

	static new(parentId = '') {
		let output = super.new();
		output.parent_id = parentId;
		return output;
	}

	static newTodo(parentId = '') {
		let output = this.new(parentId);
		output.is_todo = true;
		return output;
	}

	static sortNotes(notes, order) {
		return notes.sort((a, b) => {
			let r = -1;
			if (a[order.orderBy] < b[order.orderBy]) r = +1;
			if (order.orderByDir == 'ASC') r = -r;
			return r;
		});
	}

	static previewFields() {
		return ['id', 'title', 'body', 'is_todo', 'todo_completed', 'parent_id', 'updated_time'];
	}

	static previewFieldsSql() {
		return this.db().escapeFields(this.previewFields()).join(',');
	}

	static async loadFolderNoteByField(folderId, field, value) {
		if (!folderId) throw new Error('folderId is undefined');

		let options = {
			conditions: ['`' + field + '` = ?'],
			conditionsParams: [value],
			fields: '*',
		}

		// TODO: add support for limits on .search()

		let results = await this.previews(folderId, options);
		return results.length ? results[0] : null;
	}

	static previews(parentId, options = null) {
		if (!options) options = {};
		if (!options.orderBy) options.orderBy = 'updated_time';
		if (!options.orderByDir) options.orderByDir = 'DESC';
		if (!options.conditions) options.conditions = [];
		if (!options.conditionsParams) options.conditionsParams = [];
		if (!options.fields) options.fields = this.previewFields();

		if (parentId == Folder.conflictFolderId()) {
			options.conditions.push('is_conflict = 1');
		} else {
			options.conditions.push('is_conflict = 0');
			options.conditions.push('parent_id = ?');
			options.conditionsParams.push(parentId);
		}		

		if (options.itemTypes && options.itemTypes.length) {
			if (options.itemTypes.indexOf('note') >= 0 && options.itemTypes.indexOf('todo') >= 0) {
				// Fetch everything
			} else if (options.itemTypes.indexOf('note') >= 0) {
				options.conditions.push('is_todo = 0');
			} else if (options.itemTypes.indexOf('todo') >= 0) {
				options.conditions.push('is_todo = 1');
			}
		}

		return this.search(options);
	}

	static preview(noteId) {
		return this.modelSelectOne('SELECT ' + this.previewFieldsSql() + ' FROM notes WHERE is_conflict = 0 AND id = ?', [noteId]);
	}

	static conflictedNotes() {
		return this.modelSelectAll('SELECT * FROM notes WHERE is_conflict = 1');
	}

	static async conflictedCount() {
		let r = await this.db().selectOne('SELECT count(*) as total FROM notes WHERE is_conflict = 1');
		return r && r.total ? r.total : 0;
	}

	static unconflictedNotes() {
		return this.modelSelectAll('SELECT * FROM notes WHERE is_conflict = 0');
	}

	static async updateGeolocation(noteId) {
		if (!Note.updateGeolocationEnabled_) return;

		let startWait = time.unixMs();
		while (true) {
			if (!this.geolocationUpdating_) break;
			this.logger().info('Waiting for geolocation update...');
			await time.sleep(1);
			if (startWait + 1000 * 20 < time.unixMs()) {
				this.logger().warn('Failed to update geolocation for: timeout: ' + noteId);
				return;
			}
		}

		let geoData = null;
		if (this.geolocationCache_ && this.geolocationCache_.timestamp + 1000 * 60 * 10 > time.unixMs()) {
			geoData = Object.assign({}, this.geolocationCache_);
		} else {
			this.geolocationUpdating_ = true;
			this.logger().info('Fetching geolocation...');
			geoData = await shim.Geolocation.currentPosition();
			this.logger().info('Got lat/long');
			this.geolocationCache_ = geoData;
			this.geolocationUpdating_ = false;
		}

		this.logger().info('Updating lat/long of note ' + noteId);

		let note = await Note.load(noteId);
		if (!note) return; // Race condition - note has been deleted in the meantime

		note.longitude = geoData.coords.longitude;
		note.latitude = geoData.coords.latitude;
		note.altitude = geoData.coords.altitude;
		return Note.save(note);
	}

	static filter(note) {
		if (!note) return note;

		let output = super.filter(note);
		if ('longitude' in output) output.longitude = Number(!output.longitude ? 0 : output.longitude).toFixed(8);
		if ('latitude' in output) output.latitude = Number(!output.latitude ? 0 : output.latitude).toFixed(8);
		if ('altitude' in output) output.altitude = Number(!output.altitude ? 0 : output.altitude).toFixed(4);
		return output;
	}

	static async copyToFolder(noteId, folderId) {
		if (folderId == Folder.conflictFolderId()) throw new Error(_('Cannot copy note to "%s" notebook', Folder.conflictFolderIdTitle()));

		return Note.duplicate(noteId, {
			changes: {
				parent_id: folderId,
				is_conflict: 0, // Also reset the conflict flag in case we're moving the note out of the conflict folder
			},
		});
	}

	static async moveToFolder(noteId, folderId) {
		if (folderId == Folder.conflictFolderId()) throw new Error(_('Cannot move note to "%s" notebook', Folder.conflictFolderIdTitle()));

		return Note.save({
			id: noteId,
			parent_id: folderId,
			is_conflict: 0,
		});
	}

	static async duplicate(noteId, options = null) {
		const changes = options && options.changes;

		const originalNote = await Note.load(noteId);
		if (!originalNote) throw new Error('Unknown note: ' + noteId);

		let newNote = Object.assign({}, originalNote);
		delete newNote.id;

		for (let n in changes) {
			if (!changes.hasOwnProperty(n)) continue;
			newNote[n] = changes[n];
		}

		return this.save(newNote);
	}

	static save(o, options = null) {
		let isNew = this.isNew(o, options);
		if (isNew && !o.source) o.source = Setting.value('appName');
		if (isNew && !o.source_application) o.source_application = Setting.value('appId');

		return super.save(o, options).then((note) => {
			this.dispatch({
				type: 'NOTES_UPDATE_ONE',
				note: note,
			});
			
			return note;
		});
	}

	static async delete(id, options = null) {
		let r = await super.delete(id, options);

		this.dispatch({
			type: 'NOTES_DELETE',
			noteId: id,
		});
	}

}

Note.updateGeolocationEnabled_ = true;
Note.geolocationUpdating_ = false;

export { Note };