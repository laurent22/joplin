import { BaseModel } from 'src/base-model.js';
import { Log } from 'src/log.js';
import { Folder } from 'src/models/folder.js';
import { Geolocation } from 'src/geolocation.js';
import { folderItemFilename } from 'src/string-utils.js'
import moment from 'moment';

class Note extends BaseModel {

	static tableName() {
		return 'notes';
	}

	static toFriendlyString_format(propName, propValue) {
		if (['created_time', 'updated_time'].indexOf(propName) >= 0) {
			if (!propValue) return '';
			propValue = moment.unix(propValue).format('YYYY-MM-DD hh:mm:ss');
		} else if (propValue === null || propValue === undefined) {
			propValue = '';
		}

		return propValue;
	}

	static toFriendlyString(note) {
		let shownKeys = ["author", "longitude", "latitude", "is_todo", "todo_due", "todo_completed", 'created_time', 'updated_time'];
		let output = [];

		output.push(note.title);
		output.push("");
		output.push(note.body);
		output.push('');
		for (let i = 0; i < shownKeys.length; i++) {
			let v = note[shownKeys[i]];
			v = this.toFriendlyString_format(shownKeys[i], v);
			output.push(shownKeys[i] + ': ' + v);
		}

		return output.join("\n");
	}

	// static fromFriendlyString(item) {
	// 	let lines = [];
	// 	// mynote

	// 	// abcdefg\nsecond line\n\nline after two newline

	// 	// author: 
	// 	// longitude: -3.4596633911132812
	// 	// latitude: 48.73219093634444
	// 	// is_todo: 0
	// 	// todo_due: 0
	// 	// todo_completed: 0
	// 	// created_time: 2017-06-12 05:02:38
	// 	// updated_time: 2017-06-12 05:02:38
	// }

	static filename(note) {
		return folderItemFilename(note) + '.md';
	}

	static systemPath(parentFolder, note) {
		return Folder.systemPath(null, parentFolder) + '/' + this.filename(note);
	}

	static useUuid() {
		return true;
	}

	static itemType() {
		return BaseModel.ITEM_TYPE_NOTE;
	}

	static trackChanges() {
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
		return this.db().selectAll('SELECT ' + this.previewFieldsSql() + ' FROM notes WHERE parent_id = ?', [parentId]);
	}

	static preview(noteId) {
		return this.db().selectOne('SELECT ' + this.previewFieldsSql() + ' FROM notes WHERE id = ?', [noteId]);
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

	static save(o, options = null) {
		return super.save(o, options).then((result) => {
			// 'result' could be a partial one at this point (if, for example, only one property of it was saved)
			// so call this.preview() so that the right fields are populated.
			return this.preview(result.id);
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