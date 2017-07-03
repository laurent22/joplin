import { BaseModel } from 'lib/base-model.js';
import { Log } from 'lib/log.js';
import { Folder } from 'lib/models/folder.js';
import { GeolocationReact } from 'lib/geolocation-react.js';
import { BaseItem } from 'lib/models/base-item.js';
import { Setting } from 'lib/models/setting.js';
import moment from 'moment';
import lodash  from 'lodash';

class Note extends BaseItem {

	static tableName() {
		return 'notes';
	}

	static async serialize(note, type = null, shownKeys = null) {
		let fieldNames = this.fieldNames();
		fieldNames.push('type_');
		lodash.pull(fieldNames, 'is_conflict', 'sync_time', 'body'); // Exclude 'body' since it's going to be added separately at the top of the note
		return super.serialize(note, 'note', fieldNames);
	}

	static modelType() {
		return BaseModel.TYPE_NOTE;
	}

	static trackDeleted() {
		return true;
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

	static previewFields() {
		return ['id', 'title', 'body', 'is_todo', 'todo_completed', 'parent_id', 'updated_time'];
	}

	static previewFieldsSql() {
		return this.db().escapeFields(this.previewFields()).join(',');
	}

	static loadFolderNoteByField(folderId, field, value) {
		return this.modelSelectOne('SELECT * FROM notes WHERE is_conflict = 0 AND `parent_id` = ? AND `' + field + '` = ?', [folderId, value]);
	}

	static previews(parentId, options = null) {
		if (!options) options = {};
		if (!options.orderBy) options.orderBy = 'updated_time';
		if (!options.orderByDir) options.orderByDir = 'DESC';
		if (!options.conditions) options.conditions = [];
		if (!options.conditionsParams) options.conditionsParams = [];
		if (!options.fields) options.fields = this.previewFields();

		options.conditions.push('is_conflict = 0');
		
		options.conditions.push('parent_id = ?');
		options.conditionsParams.push(parentId);

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

		// let sql = 'SELECT ' + this.previewFieldsSql() + ' FROM notes WHERE is_conflict = 0 AND parent_id = ?';
		// let params = [parentId];
		// if (options.itemTypes && options.itemTypes.length) {
		// 	if (options.itemTypes.indexOf('note') >= 0 && options.itemTypes.indexOf('todo') >= 0) {
		// 		// Fetch everything
		// 	} else if (options.itemTypes.indexOf('note') >= 0) {
		// 		sql += ' AND is_todo = 0';
		// 	} else if (options.itemTypes.indexOf('todo') >= 0) {
		// 		sql += ' AND is_todo = 1';
		// 	}
		// }

		// if (options.titlePattern) {
		// 	let pattern = options.titlePattern.replace(/\*/g, '%');
		// 	sql += ' AND title LIKE ?';
		// 	params.push(pattern);
		// }

		// let query = this.applySqlOptions(options, sql, params);

		// return this.modelSelectAll(query.sql, query.params);
	}

	static preview(noteId) {
		return this.modelSelectOne('SELECT ' + this.previewFieldsSql() + ' FROM notes WHERE is_conflict = 0 AND id = ?', [noteId]);
	}

	static conflictedNotes() {
		return this.modelSelectAll('SELECT * FROM notes WHERE is_conflict = 1');
	}

	static unconflictedNotes() {
		return this.modelSelectAll('SELECT * FROM notes WHERE is_conflict = 0');
	}

	static updateGeolocation(noteId) {
		Log.info('Updating lat/long of note ' + noteId);

		let geoData = null;
		return GeolocationReact.currentPosition().then((data) => {
			Log.info('Got lat/long');
			geoData = data;
			return Note.load(noteId);
		}).then((note) => {
			if (!note) return; // Race condition - note has been deleted in the meantime
			note.longitude = geoData.coords.longitude;
			note.latitude = geoData.coords.latitude;
			note.altitude = geoData.coords.altitude;
			return Note.save(note);
		}).catch((error) => {
			Log.info('Cannot get location:', error);
		});
	}

	static filter(note) {
		if (!note) return note;

		let output = super.filter(note);
		if ('longitude' in output) output.longitude = Number(!output.longitude ? 0 : output.longitude).toFixed(8);
		if ('latitude' in output) output.latitude = Number(!output.latitude ? 0 : output.latitude).toFixed(8);
		if ('altitude' in output) output.altitude = Number(!output.altitude ? 0 : output.altitude).toFixed(4);
		return output;
	}

	static save(o, options = null) {
		let isNew = this.isNew(o, options);
		if (isNew && !o.source) o.source = Setting.value('appName');
		if (isNew && !o.source_application) o.source_application = Setting.value('appId');

		return super.save(o, options).then((result) => {
			// 'result' could be a partial one at this point (if, for example, only one property of it was saved)
			// so call this.preview() so that the right fields are populated.
			return this.load(result.id);
		}).then((note) => {
			this.dispatch({
				type: 'NOTES_UPDATE_ONE',
				note: note,
			});
			return note;
		});
	}

}

export { Note };