const BaseModel = require('lib/BaseModel.js');
const { Log } = require('lib/log.js');
const { sprintf } = require('sprintf-js');
const BaseItem = require('lib/models/BaseItem.js');
const Setting = require('lib/models/Setting.js');
const { shim } = require('lib/shim.js');
const { time } = require('lib/time-utils.js');
const { _ } = require('lib/locale.js');
const moment = require('moment');
const lodash = require('lodash');

class Note extends BaseItem {

	static tableName() {
		return 'notes';
	}

	static fieldToLabel(field) {
		const fieldsToLabels = {
			title: 'title',
			user_updated_time: 'updated date',
			user_created_time: 'created date',
		};

		return field in fieldsToLabels ? fieldsToLabels[field] : field;
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

	static minimalSerializeForDisplay(note) {
		let n = Object.assign({}, note);

		let fieldNames = this.fieldNames();

		if (!n.is_conflict) lodash.pull(fieldNames, 'is_conflict');
		if (!Number(n.latitude)) lodash.pull(fieldNames, 'latitude');
		if (!Number(n.longitude)) lodash.pull(fieldNames, 'longitude');
		if (!Number(n.altitude)) lodash.pull(fieldNames, 'altitude');
		if (!n.author) lodash.pull(fieldNames, 'author');
		if (!n.source_url) lodash.pull(fieldNames, 'source_url');
		if (!n.is_todo) {
			lodash.pull(fieldNames, 'is_todo');
			lodash.pull(fieldNames, 'todo_due');
			lodash.pull(fieldNames, 'todo_completed');
		}
		if (!n.application_data) lodash.pull(fieldNames, 'application_data');

		lodash.pull(fieldNames, 'type_');
		lodash.pull(fieldNames, 'title');
		lodash.pull(fieldNames, 'body');
		lodash.pull(fieldNames, 'created_time');
		lodash.pull(fieldNames, 'updated_time');
		lodash.pull(fieldNames, 'order');

		return super.serialize(n, 'note', fieldNames);
	}

	static defaultTitle(note) {
		if (note.body && note.body.length) {
			const lines = note.body.trim().split("\n");
			return lines[0].trim().substr(0, 80).trim();
		}

		return _('Untitled');
	}

	static geolocationUrl(note) {
		if (!('latitude' in note) || !('longitude' in note)) throw new Error('Latitude or longitude is missing');
		if (!Number(note.latitude) && !Number(note.longitude)) throw new Error(_('This note does not have geolocation information.'));
		return sprintf('https://www.openstreetmap.org/?lat=%s&lon=%s&zoom=20', note.latitude, note.longitude)
	}

	static modelType() {
		return BaseModel.TYPE_NOTE;
	}

	static linkedResourceIds(body) {
		// For example: ![](:/fcca2938a96a22570e8eae2565bc6b0b)
		if (!body || body.length <= 32) return [];
		const matches = body.match(/\(:\/.{32}\)/g);
		if (!matches) return [];
		return matches.map((m) => m.substr(3, 32));
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

	// Note: sort logic must be duplicated in previews();
	static sortNotes(notes, orders, uncompletedTodosOnTop) {
		const noteOnTop = (note) => {
			return uncompletedTodosOnTop && note.is_todo && !note.todo_completed;
		}

		const noteFieldComp = (f1, f2) => {
			if (f1 === f2) return 0;
			return f1 < f2 ? -1 : +1;
		}

		// Makes the sort deterministic, so that if, for example, a and b have the
		// same updated_time, they aren't swapped every time a list is refreshed.
		const sortIdenticalNotes = (a, b) => {
			let r = null;
			r = noteFieldComp(a.user_updated_time, b.user_updated_time); if (r) return r;
			r = noteFieldComp(a.user_created_time, b.user_created_time); if (r) return r;

			const titleA = a.title ? a.title.toLowerCase() : '';
			const titleB = b.title ? b.title.toLowerCase() : '';
			r = noteFieldComp(titleA, titleB); if (r) return r;
			
			return noteFieldComp(a.id, b.id);
		}

		return notes.sort((a, b) => {
			if (noteOnTop(a) && !noteOnTop(b)) return -1;
			if (!noteOnTop(a) && noteOnTop(b)) return +1;

			let r = 0;

			for (let i = 0; i < orders.length; i++) {
				const order = orders[i];
				if (a[order.by] < b[order.by]) r = +1;
				if (a[order.by] > b[order.by]) r = -1;
				if (order.dir == 'ASC') r = -r;
				if (r !== 0) return r;
			}

			return sortIdenticalNotes(a, b);
		});
	}

	static previewFields() {
		return ['id', 'title', 'body', 'is_todo', 'todo_completed', 'parent_id', 'updated_time', 'user_updated_time', 'encryption_applied'];
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

	static async previews(parentId, options = null) {
		// Note: ordering logic must be duplicated in sortNotes(), which
		// is used to sort already loaded notes.

		if (!options) options = {};
		if (!options.order) options.order = [
			{ by: 'user_updated_time', dir: 'DESC' },
			{ by: 'user_created_time', dir: 'DESC' },
			{ by: 'title', dir: 'DESC' },
			{ by: 'id', dir: 'DESC' },
		];
		if (!options.conditions) options.conditions = [];
		if (!options.conditionsParams) options.conditionsParams = [];
		if (!options.fields) options.fields = this.previewFields();
		if (!options.uncompletedTodosOnTop) options.uncompletedTodosOnTop = false;

		if (parentId == BaseItem.getClass('Folder').conflictFolderId()) {
			options.conditions.push('is_conflict = 1');
		} else {
			options.conditions.push('is_conflict = 0');
			if (parentId) {
				options.conditions.push('parent_id = ?');
				options.conditionsParams.push(parentId);
			}
		}

		if (options.anywherePattern) {
			let pattern = options.anywherePattern.replace(/\*/g, '%');
			options.conditions.push('(title LIKE ? OR body LIKE ?)');
			options.conditionsParams.push(pattern);
			options.conditionsParams.push(pattern);
		}

		let hasNotes = true;
		let hasTodos = true;
		if (options.itemTypes && options.itemTypes.length) {
			if (options.itemTypes.indexOf('note') < 0) {
				hasNotes = false;
			} else if (options.itemTypes.indexOf('todo') < 0) {
				hasTodos = false;
			}
		}

		if (options.uncompletedTodosOnTop && hasTodos) {
			let cond = options.conditions.slice();
			cond.push('is_todo = 1');
			cond.push('(todo_completed <= 0 OR todo_completed IS NULL)');
			let tempOptions = Object.assign({}, options);
			tempOptions.conditions = cond;

			let uncompletedTodos = await this.search(tempOptions);

			cond = options.conditions.slice();
			if (hasNotes && hasTodos) {
				cond.push('(is_todo = 0 OR (is_todo = 1 AND todo_completed > 0))');
			} else {
				cond.push('(is_todo = 1 AND todo_completed > 0)');
			}

			tempOptions = Object.assign({}, options);
			tempOptions.conditions = cond;
			if ('limit' in tempOptions) tempOptions.limit -= uncompletedTodos.length;
			let theRest = await this.search(tempOptions);

			return uncompletedTodos.concat(theRest);
		}

		if (hasNotes && hasTodos) {
			
		} else if (hasNotes) {
			options.conditions.push('is_todo = 0');
		} else if (hasTodos) {
			options.conditions.push('is_todo = 1');
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
		if (!Setting.value('trackLocation')) return;
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
			try {
				geoData = await shim.Geolocation.currentPosition();
			} catch (error) {
				this.logger().error('Could not get lat/long for note ' + noteId + ': ', error);
				geoData = null;
			}

			this.geolocationUpdating_ = false;

			if (!geoData) return;

			this.logger().info('Got lat/long');
			this.geolocationCache_ = geoData;
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
		if (folderId == this.getClass('Folder').conflictFolderId()) throw new Error(_('Cannot copy note to "%s" notebook', this.getClass('Folder').conflictFolderIdTitle()));

		return Note.duplicate(noteId, {
			changes: {
				parent_id: folderId,
				is_conflict: 0, // Also reset the conflict flag in case we're moving the note out of the conflict folder
			},
		});
	}

	static async moveToFolder(noteId, folderId) {
		if (folderId == this.getClass('Folder').conflictFolderId()) throw new Error(_('Cannot move note to "%s" notebook', this.getClass('Folder').conflictFolderIdTitle()));

		// When moving a note to a different folder, the user timestamp is not updated.
		// However updated_time is updated so that the note can be synced later on.

		const modifiedNote = {
			id: noteId,
			parent_id: folderId,
			is_conflict: 0,
			updated_time: time.unixMs(),
		};

		return Note.save(modifiedNote, { autoTimestamp: false });
	}

	static toggleIsTodo(note) {
		if (!('is_todo' in note)) throw new Error('Missing "is_todo" property');

		let output = Object.assign({}, note);
		output.is_todo = output.is_todo ? 0 : 1;
		output.todo_due = 0;
		output.todo_completed = 0;

		return output;
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

	static async save(o, options = null) {
		let isNew = this.isNew(o, options);
		if (isNew && !o.source) o.source = Setting.value('appName');
		if (isNew && !o.source_application) o.source_application = Setting.value('appId');

		const note = await super.save(o, options);

		this.dispatch({
			type: 'NOTE_UPDATE_ONE',
			note: note,
		});

		if ('todo_due' in o || 'todo_completed' in o || 'is_todo' in o || 'is_conflict' in o) {
			this.dispatch({
				type: 'EVENT_NOTE_ALARM_FIELD_CHANGE',
				id: note.id,
			});
		}
		
		return note;
	}

	static async delete(id, options = null) {
		let r = await super.delete(id, options);

		this.dispatch({
			type: 'NOTE_DELETE',
			id: id,
		});
	}

	static batchDelete(ids, options = null) {
		const result = super.batchDelete(ids, options);
		for (let i = 0; i < ids.length; i++) {
			this.dispatch({
				type: 'NOTE_DELETE',
				id: ids[i],
			});
		}
		return result;
	}

	static dueNotes() {
		return this.modelSelectAll('SELECT id, title, body, is_todo, todo_due, todo_completed, is_conflict FROM notes WHERE is_conflict = 0 AND is_todo = 1 AND todo_completed = 0 AND todo_due > ?', [time.unixMs()]);
	}

	static needAlarm(note) {
		return note.is_todo && !note.todo_completed && note.todo_due >= time.unixMs() && !note.is_conflict;
	}

	// Tells whether the conflict between the local and remote note can be ignored.
	static mustHandleConflict(localNote, remoteNote) {
		// That shouldn't happen so throw an exception
		if (localNote.id !== remoteNote.id) throw new Error('Cannot handle conflict for two different notes');

		// For encrypted notes the conflict must always be handled
		if (localNote.encryption_cipher_text || remoteNote.encryption_cipher_text) return true;

		// Otherwise only handle the conflict if there's a different on the title or body
		if (localNote.title !== remoteNote.title) return true;
		if (localNote.body !== remoteNote.body) return true;

		return false;
	}

}

Note.updateGeolocationEnabled_ = true;
Note.geolocationUpdating_ = false;

module.exports = Note;