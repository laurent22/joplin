import { BaseModel } from 'src/base-model.js';
import { Log } from 'src/log.js';
import { Folder } from 'src/models/folder.js';
import { Geolocation } from 'src/geolocation.js';
import { folderItemFilename } from 'src/string-utils.js'
import { BaseItem } from 'src/models/base-item.js';
import moment from 'moment';

class Note extends BaseItem {

	static tableName() {
		return 'notes';
	}

	static serialize(note, type = null, shownKeys = null) {
		return super.serialize(note, 'note', ["author", "longitude", "latitude", "is_todo", "todo_due", "todo_completed", 'created_time', 'updated_time', 'id', 'parent_id', 'type_']);
	}

	static itemType() {
		return BaseModel.MODEL_TYPE_NOTE;
	}

	static trackChanges() {
		return true;
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

	static previewFieldsSql() {
		return '`id`, `title`, `body`, `is_todo`, `todo_completed`, `parent_id`, `updated_time`'
	}

	static previews(parentId) {
		return this.modelSelectAll('SELECT ' + this.previewFieldsSql() + ' FROM notes WHERE parent_id = ?', [parentId]);
		//return this.db().selectAll('SELECT ' + this.previewFieldsSql() + ' FROM notes WHERE parent_id = ?', [parentId]);
	}

	static preview(noteId) {
		return this.modelSelectOne('SELECT ' + this.previewFieldsSql() + ' FROM notes WHERE id = ?', [noteId]);
		//return this.db().selectOne('SELECT ' + this.previewFieldsSql() + ' FROM notes WHERE id = ?', [noteId]);
	}

	static updateGeolocation(noteId) {
		Log.info('Updating lat/long of note ' + noteId);

		let geoData = null;
		return Geolocation.currentPosition().then((data) => {
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

	static all(parentId) {
		return this.modelSelectAll('SELECT * FROM notes WHERE parent_id = ?', [parentId]);
	}

	static save(o, options = null) {
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