const BaseModel = require('lib/BaseModel.js');
const { sprintf } = require('sprintf-js');
const BaseItem = require('lib/models/BaseItem.js');
const ItemChange = require('lib/models/ItemChange.js');
const Resource = require('lib/models/Resource.js');
const Setting = require('lib/models/Setting.js');
const { shim } = require('lib/shim.js');
const { pregQuote } = require('lib/string-utils.js');
const { time } = require('lib/time-utils.js');
const { _ } = require('lib/locale.js');
const ArrayUtils = require('lib/ArrayUtils.js');
const lodash = require('lodash');
const urlUtils = require('lib/urlUtils.js');
const { MarkupToHtml } = require('lib/joplin-renderer');
const { ALL_NOTES_FILTER_ID } = require('lib/reserved-ids');

class Note extends BaseItem {
	static tableName() {
		return 'notes';
	}

	static fieldToLabel(field) {
		const fieldsToLabels = {
			title: _('title'),
			user_updated_time: _('updated date'),
			user_created_time: _('created date'),
			// it is expire date of notes and not the alarm date
			due_date: _('Due Date'),
		};

		return field in fieldsToLabels ? fieldsToLabels[field] : field;
	}

	static async serializeForEdit(note) {
		return this.replaceResourceInternalToExternalLinks(await super.serialize(note, ['title', 'body']));
	}

	static async unserializeForEdit(content) {
		content += `\n\ntype_: ${BaseModel.TYPE_NOTE}`;
		const output = await super.unserialize(content);
		if (!output.title) output.title = '';
		if (!output.body) output.body = '';
		output.body = await this.replaceResourceExternalToInternalLinks(output.body);
		return output;
	}

	static async serializeAllProps(note) {
		const fieldNames = this.fieldNames();
		fieldNames.push('type_');
		lodash.pull(fieldNames, 'title', 'body');
		return super.serialize(note, fieldNames);
	}

	static minimalSerializeForDisplay(note) {
		const n = Object.assign({}, note);

		const fieldNames = this.fieldNames();

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
		lodash.pull(fieldNames, 'due_date');

		return super.serialize(n, fieldNames);
	}

	static defaultTitle(note) {
		return this.defaultTitleFromBody(note.body);
	}

	static defaultTitleFromBody(body) {
		if (body && body.length) {
			const lines = body.trim().split('\n');
			let output = lines[0].trim();
			// Remove the first #, *, etc.
			while (output.length) {
				const c = output[0];
				if (['#', ' ', '\n', '\t', '*', '`', '-'].indexOf(c) >= 0) {
					output = output.substr(1);
				} else {
					break;
				}
			}
			return output.substr(0, 80).trim();
		}

		return _('Untitled');
	}

	static geolocationUrl(note) {
		if (!('latitude' in note) || !('longitude' in note)) throw new Error('Latitude or longitude is missing');
		if (!Number(note.latitude) && !Number(note.longitude)) throw new Error(_('This note does not have geolocation information.'));
		return this.geoLocationUrlFromLatLong(note.latitude, note.longitude);
	}

	static geoLocationUrlFromLatLong(lat, long) {
		return sprintf('https://www.openstreetmap.org/?lat=%s&lon=%s&zoom=20', lat, long);
	}

	static modelType() {
		return BaseModel.TYPE_NOTE;
	}

	static linkedItemIds(body) {
		if (!body || body.length <= 32) return [];

		const links = urlUtils.extractResourceUrls(body);
		const itemIds = links.map(l => l.itemId);
		return ArrayUtils.unique(itemIds);
	}

	static async linkedItems(body) {
		const itemIds = this.linkedItemIds(body);
		const r = await BaseItem.loadItemsByIds(itemIds);
		return r;
	}

	static async linkedItemIdsByType(type, body) {
		const items = await this.linkedItems(body);
		const output = [];

		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			if (item.type_ === type) output.push(item.id);
		}

		return output;
	}

	static async linkedResourceIds(body) {
		return this.linkedItemIdsByType(BaseModel.TYPE_RESOURCE, body);
	}

	static async linkedNoteIds(body) {
		return this.linkedItemIdsByType(BaseModel.TYPE_NOTE, body);
	}

	static async replaceResourceInternalToExternalLinks(body, options = null) {
		options = Object.assign({}, {
			useAbsolutePaths: false,
		}, options);

		const resourceIds = await this.linkedResourceIds(body);
		const Resource = this.getClass('Resource');

		for (let i = 0; i < resourceIds.length; i++) {
			const id = resourceIds[i];
			const resource = await Resource.load(id);
			if (!resource) continue;
			const resourcePath = options.useAbsolutePaths ? Resource.fullPath(resource) : Resource.relativePath(resource);
			body = body.replace(new RegExp(`:/${id}`, 'gi'), resourcePath);
		}

		return body;
	}

	static async replaceResourceExternalToInternalLinks(body, options = null) {
		options = Object.assign({}, {
			useAbsolutePaths: false,
		}, options);

		const pathsToTry = [];
		if (options.useAbsolutePaths) {
			pathsToTry.push(Setting.value('resourceDir'));
			pathsToTry.push(shim.pathRelativeToCwd(Setting.value('resourceDir')));
		} else {
			pathsToTry.push(Resource.baseRelativeDirectoryPath());
		}

		for (const basePath of pathsToTry) {
			const reString = `${pregQuote(`${basePath}/`)}[a-zA-Z0-9.]+`;
			const re = new RegExp(reString, 'gi');
			body = body.replace(re, match => {
				const id = Resource.pathToId(match);
				return `:/${id}`;
			});
		}

		return body;
	}

	static new(parentId = '') {
		const output = super.new();
		output.parent_id = parentId;
		return output;
	}

	static newTodo(parentId = '') {
		const output = this.new(parentId);
		output.is_todo = true;
		return output;
	}

	// Note: sort logic must be duplicated in previews();
	static sortNotes(notes, orders, uncompletedTodosOnTop) {
		const noteOnTop = note => {
			return uncompletedTodosOnTop && note.is_todo && !note.todo_completed;
		};

		// this function will return true if the due date is set by the user for the todo, otherwise false
		const dueDateSet = note => {
			return !(note.due_date == 0 || note.due_date == null);
		};

		const noteFieldComp = (f1, f2) => {
			if (f1 === f2) return 0;
			return f1 < f2 ? -1 : +1;
		};

		// Makes the sort deterministic, so that if, for example, a and b have the
		// same updated_time, they aren't swapped every time a list is refreshed.
		const sortIdenticalNotes = (a, b) => {
			let r = null;
			r = noteFieldComp(a.user_updated_time, b.user_updated_time);
			if (r) return r;
			r = noteFieldComp(a.user_created_time, b.user_created_time);
			if (r) return r;

			const titleA = a.title ? a.title.toLowerCase() : '';
			const titleB = b.title ? b.title.toLowerCase() : '';
			r = noteFieldComp(titleA, titleB);
			if (r) return r;

			return noteFieldComp(a.id, b.id);
		};

		// this is to check if sorted order is based on due_date
		const res = orders.find(order => order.by == 'due_date');

		if (res) {
			// if sorting is based on due_date, then follow these rules
			const sortedNotes = notes.sort((a, b) =>{
				// todos have to be above notes
				if (a.is_todo && !b.is_todo) return -1;
				if (!a.is_todo && b.is_todo) return +1;

				// notes can be sorted on basis of sortIdenticalNotes function (which is updated and created_time)
				if (!a.is_todo && !b.is_todo) return sortIdenticalNotes(a, b);

				// in todos incomplete todos have to be above completed todos
				if (a.todo_completed && !b.todo_completed) return +1;
				if (!a.todo_completed && b.todo_completed) return -1;

				// in all incomplete todos, the one with due dates set by user have to be on top
				if (dueDateSet(a) && dueDateSet(b)) return new Date(a.due_date) - new Date(b.due_date);

				// if one note has due date set and one hasn't, then the one with due date will be on top
				if (dueDateSet(a) && !dueDateSet(b)) return -1;
				if (!dueDateSet(a) && dueDateSet(b)) return +1;

				return sortIdenticalNotes(a, b);
			});

			return sortedNotes;
		}

		return notes.sort((a, b) => {
			if (noteOnTop(a) && !noteOnTop(b)) return -1;
			if (!noteOnTop(a) && noteOnTop(b)) return +1;

			let r = 0;

			for (let i = 0; i < orders.length; i++) {
				const order = orders[i];
				let aProp = a[order.by];
				let bProp = b[order.by];
				if (typeof aProp === 'string') aProp = aProp.toLowerCase();
				if (typeof bProp === 'string') bProp = bProp.toLowerCase();
				if (aProp < bProp) r = +1;
				if (aProp > bProp) r = -1;
				if (order.dir == 'ASC') r = -r;
				if (r !== 0) return r;
			}

			return sortIdenticalNotes(a, b);
		});
	}

	static previewFields() {
		// return ['id', 'title', 'body', 'is_todo', 'todo_completed', 'parent_id', 'updated_time', 'user_updated_time', 'user_created_time', 'encryption_applied'];
		return ['id', 'title', 'is_todo', 'todo_completed', 'parent_id', 'updated_time', 'user_updated_time', 'user_created_time', 'encryption_applied','due_date'];
	}

	static previewFieldsSql(fields = null) {
		if (fields === null) fields = this.previewFields();
		return this.db()
			.escapeFields(fields)
			.join(',');
	}

	static async loadFolderNoteByField(folderId, field, value) {
		if (!folderId) throw new Error('folderId is undefined');

		const options = {
			conditions: [`\`${field}\` = ?`],
			conditionsParams: [value],
			fields: '*',
		};

		const results = await this.previews(folderId, options);
		return results.length ? results[0] : null;
	}

	static async previews(parentId, options = null) {
		// Note: ordering logic must be duplicated in sortNotes(), which
		// is used to sort already loaded notes.

		if (!options) options = {};
		if (!('order' in options)) options.order = [{ by: 'user_updated_time', dir: 'DESC' }, { by: 'user_created_time', dir: 'DESC' }, { by: 'title', dir: 'DESC' }, { by: 'id', dir: 'DESC' }, { by: 'due_date', dir: 'DESC' }];
		if (!options.conditions) options.conditions = [];
		if (!options.conditionsParams) options.conditionsParams = [];
		if (!options.fields) options.fields = this.previewFields();
		if (!options.uncompletedTodosOnTop) options.uncompletedTodosOnTop = false;
		if (!('showCompletedTodos' in options)) options.showCompletedTodos = true;

		if (parentId == BaseItem.getClass('Folder').conflictFolderId()) {
			options.conditions.push('is_conflict = 1');
		} else {
			options.conditions.push('is_conflict = 0');
			if (parentId && parentId !== ALL_NOTES_FILTER_ID) {
				options.conditions.push('parent_id = ?');
				options.conditionsParams.push(parentId);
			}
		}

		if (options.anywherePattern) {
			const pattern = options.anywherePattern.replace(/\*/g, '%');
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

		if (!options.showCompletedTodos) {
			options.conditions.push('todo_completed <= 0');
		}

		// this is to check if we have to sort by due_date, if yes, then we will use if condition written below
		const sortByDueDate = options.order.find(order => order.by == 'due_date');

		// these will be cases to sort on basis of due_date:
		// 1 incomplete todos with less due date will be on top
		// 2 incomplete todos with more due date afterwards and then incomplete todos with no due dates.
		// 3 completes todos with less due date
		// 4 complete todos with more due date
		// 5 complete todos with no due dates
		// 6 notes ( sorted on their updated time, created time, id )
		if (sortByDueDate && hasTodos) {
			let conditions = options.conditions.slice();
			conditions.push('is_todo = 1');
			conditions.push('(todo_completed <= 0 OR todo_completed IS NULL)');
			conditions.push('(due_date != 0 AND due_date IS NOT NULL)');
			let tempOptions = Object.assign({}, options);
			tempOptions.conditions = conditions;

			const todosWithDueDateNotCompleted = await this.search(tempOptions);

			conditions = options.conditions.slice();
			conditions.push('is_todo = 1');
			conditions.push('(todo_completed <= 0 OR todo_completed IS NULL)');
			conditions.push('(due_date == 0 OR due_date IS NULL)');
			tempOptions = Object.assign({}, options);
			tempOptions.conditions = conditions;

			const todosWithoutDueDateNotCompleted = await this.search(tempOptions);

			const todosNotCompleted = todosWithDueDateNotCompleted.concat(todosWithoutDueDateNotCompleted);

			conditions = options.conditions.slice();
			conditions.push('(is_todo = 1 AND todo_completed > 0)');
			conditions.push('(due_date != 0 AND due_date IS NOT NULL)');
			tempOptions = Object.assign({}, options);
			tempOptions.conditions = conditions;

			const todosWithDueDateCompleted = await this.search(tempOptions);

			conditions = options.conditions.slice();
			conditions.push('(is_todo = 1 AND todo_completed > 0)');
			conditions.push('(due_date == 0 OR due_date IS NULL)');
			tempOptions = Object.assign({}, options);
			tempOptions.conditions = conditions;

			const todosWithoutDueDateCompleted = await this.search(tempOptions);

			const todosCompleted = todosWithDueDateCompleted.concat(todosWithoutDueDateCompleted);

			const totalTodos = todosNotCompleted.concat(todosCompleted);

			if (hasTodos && hasNotes) {
				conditions = options.conditions.slice();
				conditions.push('is_todo == 0');
				tempOptions = Object.assign({}, options);
				tempOptions.conditions = conditions;

				const totalNotes = await this.search(tempOptions);

				return totalTodos.concat(totalNotes);
			}

			return totalTodos;
		}

		if (options.uncompletedTodosOnTop && hasTodos) {
			let cond = options.conditions.slice();
			cond.push('is_todo = 1');
			cond.push('(todo_completed <= 0 OR todo_completed IS NULL)');
			let tempOptions = Object.assign({}, options);
			tempOptions.conditions = cond;

			const uncompletedTodos = await this.search(tempOptions);

			cond = options.conditions.slice();
			if (hasNotes && hasTodos) {
				cond.push('(is_todo = 0 OR (is_todo = 1 AND todo_completed > 0))');
			} else {
				cond.push('(is_todo = 1 AND todo_completed > 0)');
			}

			tempOptions = Object.assign({}, options);
			tempOptions.conditions = cond;
			if ('limit' in tempOptions) tempOptions.limit -= uncompletedTodos.length;
			const theRest = await this.search(tempOptions);

			return uncompletedTodos.concat(theRest);
		}

		if (hasNotes && hasTodos) {
			// Nothing
		} else if (hasNotes) {
			options.conditions.push('is_todo = 0');
		} else if (hasTodos) {
			options.conditions.push('is_todo = 1');
		}

		return this.search(options);
	}

	static preview(noteId, options = null) {
		if (!options) options = { fields: null };
		return this.modelSelectOne(`SELECT ${this.previewFieldsSql(options.fields)} FROM notes WHERE is_conflict = 0 AND id = ?`, [noteId]);
	}

	static async search(options = null) {
		if (!options) options = {};
		if (!options.conditions) options.conditions = [];
		if (!options.conditionsParams) options.conditionsParams = [];

		if (options.bodyPattern) {
			const pattern = options.bodyPattern.replace(/\*/g, '%');
			options.conditions.push('body LIKE ?');
			options.conditionsParams.push(pattern);
		}

		return super.search(options);
	}

	static conflictedNotes() {
		return this.modelSelectAll('SELECT * FROM notes WHERE is_conflict = 1');
	}

	static async conflictedCount() {
		const r = await this.db().selectOne('SELECT count(*) as total FROM notes WHERE is_conflict = 1');
		return r && r.total ? r.total : 0;
	}

	static unconflictedNotes() {
		return this.modelSelectAll('SELECT * FROM notes WHERE is_conflict = 0');
	}

	static async updateGeolocation(noteId) {
		if (!Setting.value('trackLocation')) return;
		if (!Note.updateGeolocationEnabled_) return;

		const startWait = time.unixMs();
		while (true) {
			if (!this.geolocationUpdating_) break;
			this.logger().info('Waiting for geolocation update...');
			await time.sleep(1);
			if (startWait + 1000 * 20 < time.unixMs()) {
				this.logger().warn(`Failed to update geolocation for: timeout: ${noteId}`);
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
				this.logger().error(`Could not get lat/long for note ${noteId}: `, error);
				geoData = null;
			}

			this.geolocationUpdating_ = false;

			if (!geoData) return;

			this.logger().info('Got lat/long');
			this.geolocationCache_ = geoData;
		}

		this.logger().info(`Updating lat/long of note ${noteId}`);

		const note = await Note.load(noteId);
		if (!note) return; // Race condition - note has been deleted in the meantime

		note.longitude = geoData.coords.longitude;
		note.latitude = geoData.coords.latitude;
		note.altitude = geoData.coords.altitude;
		return Note.save(note);
	}

	static filter(note) {
		if (!note) return note;

		const output = super.filter(note);
		if ('longitude' in output) output.longitude = Number(!output.longitude ? 0 : output.longitude).toFixed(8);
		if ('latitude' in output) output.latitude = Number(!output.latitude ? 0 : output.latitude).toFixed(8);
		if ('altitude' in output) output.altitude = Number(!output.altitude ? 0 : output.altitude).toFixed(4);
		return output;
	}

	static async copyToFolder(noteId, folderId) {
		if (folderId == this.getClass('Folder').conflictFolderId()) throw new Error(_('Cannot copy note to "%s" notebook', this.getClass('Folder').conflictFolderTitle()));

		return Note.duplicate(noteId, {
			changes: {
				parent_id: folderId,
				is_conflict: 0, // Also reset the conflict flag in case we're moving the note out of the conflict folder
			},
		});
	}

	static async moveToFolder(noteId, folderId) {
		if (folderId == this.getClass('Folder').conflictFolderId()) throw new Error(_('Cannot move note to "%s" notebook', this.getClass('Folder').conflictFolderTitle()));

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

	static changeNoteType(note, type) {
		if (!('is_todo' in note)) throw new Error('Missing "is_todo" property');

		const newIsTodo = type === 'todo' ? 1 : 0;

		if (Number(note.is_todo) === newIsTodo) return note;

		const output = Object.assign({}, note);
		output.is_todo = newIsTodo;
		output.todo_due = 0;
		output.todo_completed = 0;

		return output;
	}

	static toggleIsTodo(note) {
		return this.changeNoteType(note, note.is_todo ? 'note' : 'todo');
	}

	static toggleTodoCompleted(note) {
		if (!('todo_completed' in note)) throw new Error('Missing "todo_completed" property');

		note = Object.assign({}, note);
		if (note.todo_completed) {
			note.todo_completed = 0;
		} else {
			note.todo_completed = Date.now();
		}

		return note;
	}

	static async duplicateMultipleNotes(noteIds, options = null) {
		// if options.uniqueTitle is true, a unique title for the duplicated file will be assigned.
		const ensureUniqueTitle = options && options.ensureUniqueTitle;

		for (const noteId of noteIds) {
			const noteOptions = {};

			// If ensureUniqueTitle is truthy, set the original note's name as root for the unique title.
			if (ensureUniqueTitle) {
				const originalNote = await Note.load(noteId);
				noteOptions.uniqueTitle = originalNote.title;
			}

			await Note.duplicate(noteId, noteOptions);
		}
	}

	static async duplicate(noteId, options = null) {
		const changes = options && options.changes;
		const uniqueTitle = options && options.uniqueTitle;

		const originalNote = await Note.load(noteId);
		if (!originalNote) throw new Error(`Unknown note: ${noteId}`);

		const newNote = Object.assign({}, originalNote);
		const fieldsToReset = ['id', 'created_time', 'updated_time', 'user_created_time', 'user_updated_time'];

		for (const field of fieldsToReset) {
			delete newNote[field];
		}

		for (const n in changes) {
			if (!changes.hasOwnProperty(n)) continue;
			newNote[n] = changes[n];
		}

		if (uniqueTitle) {
			const title = await Note.findUniqueItemTitle(uniqueTitle);
			newNote.title = title;
		}

		return this.save(newNote);
	}

	static async noteIsOlderThan(noteId, date) {
		const n = await this.db().selectOne('SELECT updated_time FROM notes WHERE id = ?', [noteId]);
		if (!n) throw new Error(`No such note: ${noteId}`);
		return n.updated_time < date;
	}

	static async save(o, options = null) {
		const isNew = this.isNew(o, options);
		const isProvisional = options && !!options.provisional;
		if (isNew && !o.source) o.source = Setting.value('appName');
		if (isNew && !o.source_application) o.source_application = Setting.value('appId');

		// We only keep the previous note content for "old notes" (see Revision Service for more info)
		// In theory, we could simply save all the previous note contents, and let the revision service
		// decide what to keep and what to ignore, but in practice keeping the previous content is a bit
		// heavy - the note needs to be reloaded here, the JSON blob needs to be saved, etc.
		// So the check for old note here is basically an optimisation.
		let beforeNoteJson = null;
		if (!isNew && this.revisionService().isOldNote(o.id)) {
			beforeNoteJson = await Note.load(o.id);
			if (beforeNoteJson) beforeNoteJson = JSON.stringify(beforeNoteJson);
		}

		const note = await super.save(o, options);

		const changeSource = options && options.changeSource ? options.changeSource : null;
		ItemChange.add(BaseModel.TYPE_NOTE, note.id, isNew ? ItemChange.TYPE_CREATE : ItemChange.TYPE_UPDATE, changeSource, beforeNoteJson);

		this.dispatch({
			type: 'NOTE_UPDATE_ONE',
			note: note,
			provisional: isProvisional,
		});

		if ('todo_due' in o || 'todo_completed' in o || 'is_todo' in o || 'is_conflict' in o) {
			this.dispatch({
				type: 'EVENT_NOTE_ALARM_FIELD_CHANGE',
				id: note.id,
			});
		}

		return note;
	}

	static async batchDelete(ids, options = null) {
		ids = ids.slice();

		while (ids.length) {
			const processIds = ids.splice(0, 50);

			const notes = await Note.byIds(processIds);
			const beforeChangeItems = {};
			for (const note of notes) {
				beforeChangeItems[note.id] = JSON.stringify(note);
			}

			await super.batchDelete(processIds, options);
			const changeSource = options && options.changeSource ? options.changeSource : null;
			for (let i = 0; i < processIds.length; i++) {
				const id = processIds[i];
				ItemChange.add(BaseModel.TYPE_NOTE, id, ItemChange.TYPE_DELETE, changeSource, beforeChangeItems[id]);

				this.dispatch({
					type: 'NOTE_DELETE',
					id: id,
				});
			}
		}
	}

	static dueNotes() {
		return this.modelSelectAll('SELECT id, title, body, is_todo, todo_due, todo_completed, is_conflict FROM notes WHERE is_conflict = 0 AND is_todo = 1 AND todo_completed = 0 AND todo_due > ?', [time.unixMs()]);
	}

	static needAlarm(note) {
		return note.is_todo && !note.todo_completed && note.todo_due >= time.unixMs() && !note.is_conflict;
	}

	// this will return alarm time of todos, it has nothing to do with expire date
	static dueDateObject(note) {
		if (!!note.is_todo && note.todo_due) {
			if (!this.dueDateObjects_) this.dueDateObjects_ = {};
			if (this.dueDateObjects_[note.todo_due]) return this.dueDateObjects_[note.todo_due];
			this.dueDateObjects_[note.todo_due] = new Date(note.todo_due);
			return this.dueDateObjects_[note.todo_due];
		}

		return null;
	}

	// this will return date of due date of todos (here due date means expire and not for alarms)
	static dueDateObjectForExpire(note) {
		if (!!note.is_todo && note.due_date) {
			// if the object is not present, it will make an empty object
			if (!this.dueDateObjects) {
				this.dueDateObjects = {};
			}

			// if the object is already present, it will return that object
			if (this.dueDateObjects[note.due_date]) {
				return this.dueDateObjects[note.due_date];
			}
			// otherwise it will assign the object the due date (expire date) of the note and will return it
			this.dueDateObjects[note.due_date] = new Date(note.due_date);
			return this.dueDateObjects[note.due_date];
		}

		return null;
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

	static markupLanguageToLabel(markupLanguageId) {
		if (markupLanguageId === MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN) return 'Markdown';
		if (markupLanguageId === MarkupToHtml.MARKUP_LANGUAGE_HTML) return 'HTML';
		throw new Error(`Invalid markup language ID: ${markupLanguageId}`);
	}
}

Note.updateGeolocationEnabled_ = true;
Note.geolocationUpdating_ = false;

module.exports = Note;
