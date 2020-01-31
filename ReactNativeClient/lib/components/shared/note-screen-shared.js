const { reg } = require('lib/registry.js');
const Folder = require('lib/models/Folder.js');
const BaseModel = require('lib/BaseModel.js');
const Note = require('lib/models/Note.js');
const Resource = require('lib/models/Resource.js');
const ResourceFetcher = require('lib/services/ResourceFetcher.js');
const DecryptionWorker = require('lib/services/DecryptionWorker.js');
const Setting = require('lib/models/Setting.js');
const Mutex = require('async-mutex').Mutex;

const shared = {};

// If saveNoteButton_press is called multiple times in short intervals, it might result in
// the same new note being created twice, so we need to a mutex to access this function.
const saveNoteMutex_ = new Mutex();

shared.noteExists = async function(noteId) {
	const existingNote = await Note.load(noteId);
	return !!existingNote;
};

shared.saveNoteButton_press = async function(comp, folderId = null, options = null) {
	options = Object.assign(
		{},
		{
			autoTitle: true,
		},
		options
	);

	const releaseMutex = await saveNoteMutex_.acquire();

	let note = Object.assign({}, comp.state.note);

	// Note has been deleted while user was modifying it. In that case, we
	// just save a new note by clearing the note ID.
	if (note.id && !(await shared.noteExists(note.id))) delete note.id;

	if (folderId) {
		note.parent_id = folderId;
	} else if (!note.parent_id) {
		const activeFolderId = Setting.value('activeFolderId');
		let folder = await Folder.load(activeFolderId);
		if (!folder) folder = await Folder.defaultFolder();
		if (!folder) return releaseMutex();
		note.parent_id = folder.id;
	}

	let isNew = !note.id;

	let saveOptions = { userSideValidation: true };
	if (!isNew) {
		saveOptions.fields = BaseModel.diffObjectsFields(comp.state.lastSavedNote, note);
	}

	const hasAutoTitle = comp.state.newAndNoTitleChangeNoteId || (isNew && !note.title);
	if (hasAutoTitle && options.autoTitle) {
		note.title = Note.defaultTitle(note);
		if (saveOptions.fields && saveOptions.fields.indexOf('title') < 0) saveOptions.fields.push('title');
	}

	const savedNote = 'fields' in saveOptions && !saveOptions.fields.length ? Object.assign({}, note) : await Note.save(note, saveOptions);

	const stateNote = comp.state.note;

	// Note was reloaded while being saved.
	if (!isNew && (!stateNote || stateNote.id !== savedNote.id)) return releaseMutex();

	// Re-assign any property that might have changed during saving (updated_time, etc.)
	note = Object.assign(note, savedNote);

	if (stateNote.id === note.id) {
		// But we preserve the current title and body because
		// the user might have changed them between the time
		// saveNoteButton_press was called and the note was
		// saved (it's done asynchronously).
		//
		// If the title was auto-assigned above, we don't restore
		// it from the state because it will be empty there.
		if (!hasAutoTitle) note.title = stateNote.title;
		note.body = stateNote.body;
	}

	let newState = {
		lastSavedNote: Object.assign({}, note),
		note: note,
	};

	if (isNew && hasAutoTitle) newState.newAndNoTitleChangeNoteId = note.id;

	if (!options.autoTitle) newState.newAndNoTitleChangeNoteId = null;

	comp.setState(newState);

	// await shared.refreshAttachedResources(comp, newState.note.body);

	if (isNew) {
		Note.updateGeolocation(note.id).then(geoNote => {
			const stateNote = comp.state.note;
			if (!stateNote || !geoNote) return;
			if (stateNote.id !== geoNote.id) return; // Another note has been loaded while geoloc was being retrieved

			// Geo-location for this note has been saved to the database however the properties
			// are is not in the state so set them now.

			const geoInfo = {
				longitude: geoNote.longitude,
				latitude: geoNote.latitude,
				altitude: geoNote.altitude,
			};

			const modNote = Object.assign({}, stateNote, geoInfo);
			const modLastSavedNote = Object.assign({}, comp.state.lastSavedNote, geoInfo);

			comp.setState({ note: modNote, lastSavedNote: modLastSavedNote });
		});
	}

	if (isNew) {
		// Clear the newNote item now that the note has been saved, and
		// make sure that the note we're editing is selected.
		comp.props.dispatch({
			type: 'NOTE_SELECT',
			id: savedNote.id,
		});
	}

	releaseMutex();
};

shared.saveOneProperty = async function(comp, name, value) {
	let note = Object.assign({}, comp.state.note);

	// Note has been deleted while user was modifying it. In that, we
	// just save a new note by clearing the note ID.
	if (note.id && !(await shared.noteExists(note.id))) delete note.id;

	// reg.logger().info('Saving note property: ', note.id, name, value);

	if (note.id) {
		let toSave = { id: note.id };
		toSave[name] = value;
		toSave = await Note.save(toSave);
		note[name] = toSave[name];

		comp.setState({
			lastSavedNote: Object.assign({}, note),
			note: note,
		});
	} else {
		note[name] = value;
		comp.setState({ note: note });
	}
};

shared.noteComponent_change = function(comp, propName, propValue) {
	let newState = {};

	let note = Object.assign({}, comp.state.note);
	note[propName] = propValue;
	newState.note = note;

	comp.setState(newState);
};

let resourceCache_ = {};

shared.clearResourceCache = function() {
	resourceCache_ = {};
};

shared.attachedResources = async function(noteBody) {
	if (!noteBody) return {};
	const resourceIds = await Note.linkedItemIdsByType(BaseModel.TYPE_RESOURCE, noteBody);

	const output = {};
	for (let i = 0; i < resourceIds.length; i++) {
		const id = resourceIds[i];

		if (resourceCache_[id]) {
			output[id] = resourceCache_[id];
		} else {
			const resource = await Resource.load(id);
			const localState = await Resource.localState(resource);

			const o = {
				item: resource,
				localState: localState,
			};

			// eslint-disable-next-line require-atomic-updates
			resourceCache_[id] = o;
			output[id] = o;
		}
	}

	return output;
};

shared.isModified = function(comp) {
	if (!comp.state.note || !comp.state.lastSavedNote) return false;
	let diff = BaseModel.diffObjects(comp.state.lastSavedNote, comp.state.note);
	delete diff.type_;
	return !!Object.getOwnPropertyNames(diff).length;
};

shared.initState = async function(comp) {
	let note = null;
	let mode = 'view';
	if (!comp.props.noteId) {
		note = comp.props.itemType == 'todo' ? Note.newTodo(comp.props.folderId) : Note.new(comp.props.folderId);
		mode = 'edit';
		comp.scheduleFocusUpdate();
	} else {
		note = await Note.load(comp.props.noteId);
	}

	const folder = Folder.byId(comp.props.folders, note.parent_id);

	comp.setState({
		lastSavedNote: Object.assign({}, note),
		note: note,
		mode: mode,
		folder: folder,
		isLoading: false,
		fromShare: comp.props.sharedData ? true : false,
		noteResources: await shared.attachedResources(note ? note.body : ''),
	});

	if (comp.props.sharedData) {
		this.noteComponent_change(comp, 'body', comp.props.sharedData.value);
	}

	// eslint-disable-next-line require-atomic-updates
	comp.lastLoadedNoteId_ = note ? note.id : null;
};

shared.toggleIsTodo_onPress = function(comp) {
	let newNote = Note.toggleIsTodo(comp.state.note);
	let newState = { note: newNote };
	comp.setState(newState);
};

shared.toggleCheckbox = function(ipcMessage, noteBody) {
	let newBody = noteBody.split('\n');
	const p = ipcMessage.split(':');
	const lineIndex = Number(p[p.length - 1]);
	if (lineIndex >= newBody.length) {
		reg.logger().warn('Checkbox line out of bounds: ', ipcMessage);
		return newBody.join('\n');
	}

	let line = newBody[lineIndex];

	const noCrossIndex = line.trim().indexOf('- [ ] ');
	let crossIndex = line.trim().indexOf('- [x] ');
	if (crossIndex < 0) crossIndex = line.trim().indexOf('- [X] ');

	if (noCrossIndex < 0 && crossIndex < 0) {
		reg.logger().warn('Could not find matching checkbox for message: ', ipcMessage);
		return newBody.join('\n');
	}

	let isCrossLine = false;

	if (noCrossIndex >= 0 && crossIndex >= 0) {
		isCrossLine = crossIndex < noCrossIndex;
	} else {
		isCrossLine = crossIndex >= 0;
	}

	if (!isCrossLine) {
		line = line.replace(/- \[ \] /, '- [x] ');
	} else {
		line = line.replace(/- \[x\] /i, '- [ ] ');
	}

	newBody[lineIndex] = line;
	return newBody.join('\n');
};

shared.installResourceHandling = function(refreshResourceHandler) {
	ResourceFetcher.instance().on('downloadComplete', refreshResourceHandler);
	ResourceFetcher.instance().on('downloadStarted', refreshResourceHandler);
	DecryptionWorker.instance().on('resourceDecrypted', refreshResourceHandler);
};

shared.uninstallResourceHandling = function(refreshResourceHandler) {
	ResourceFetcher.instance().off('downloadComplete', refreshResourceHandler);
	ResourceFetcher.instance().off('downloadStarted', refreshResourceHandler);
	DecryptionWorker.instance().off('resourceDecrypted', refreshResourceHandler);
};

module.exports = shared;
