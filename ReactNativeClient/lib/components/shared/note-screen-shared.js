const { reg } = require("lib/registry.js");
const Folder = require("lib/models/Folder.js");
const BaseModel = require("lib/BaseModel.js");
const Note = require("lib/models/Note.js");

const shared = {};

shared.noteExists = async function(noteId) {
	const existingNote = await Note.load(noteId);
	return !!existingNote;
};

shared.saveNoteButton_press = async function(comp) {
	let note = Object.assign({}, comp.state.note);

	// Note has been deleted while user was modifying it. In that case, we
	// just save a new note by clearing the note ID.
	if (note.id && !await shared.noteExists(note.id)) delete note.id;

	if (!note.parent_id) {
		let folder = await Folder.defaultFolder();
		if (!folder) return;
		note.parent_id = folder.id;
	}

	let isNew = !note.id;

	let options = { userSideValidation: true };
	if (!isNew) {
		options.fields = BaseModel.diffObjectsFields(comp.state.lastSavedNote, note);
	}

	const hasAutoTitle = comp.state.newAndNoTitleChangeNoteId || (isNew && !note.title);
	if (hasAutoTitle) {
		note.title = Note.defaultTitle(note);
		if (options.fields && options.fields.indexOf("title") < 0) options.fields.push("title");
	}

	const savedNote = "fields" in options && !options.fields.length ? Object.assign({}, note) : await Note.save(note, options);

	const stateNote = comp.state.note;

	// Note was reloaded while being saved.
	if (!isNew && (!stateNote || stateNote.id !== savedNote.id)) return;

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

	comp.setState(newState);

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
			comp.refreshNoteMetadata();
		});
	}

	comp.refreshNoteMetadata();

	if (isNew) {
		// Clear the newNote item now that the note has been saved, and
		// make sure that the note we're editing is selected.
		comp.props.dispatch({
			type: "NOTE_SELECT",
			id: savedNote.id,
		});
	}
};

shared.saveOneProperty = async function(comp, name, value) {
	let note = Object.assign({}, comp.state.note);

	// Note has been deleted while user was modifying it. In that, we
	// just save a new note by clearing the note ID.
	if (note.id && !await shared.noteExists(note.id)) delete note.id;

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

shared.refreshNoteMetadata = async function(comp, force = null) {
	if (force !== true && !comp.state.showNoteMetadata) return;

	let noteMetadata = await Note.serializeAllProps(comp.state.note);
	comp.setState({ noteMetadata: noteMetadata });
};

shared.isModified = function(comp) {
	if (!comp.state.note || !comp.state.lastSavedNote) return false;
	let diff = BaseModel.diffObjects(comp.state.lastSavedNote, comp.state.note);
	delete diff.type_;
	return !!Object.getOwnPropertyNames(diff).length;
};

shared.initState = async function(comp) {
	let note = null;
	let mode = "view";
	if (!comp.props.noteId) {
		note = comp.props.itemType == "todo" ? Note.newTodo(comp.props.folderId) : Note.new(comp.props.folderId);
		mode = "edit";
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
	});

	comp.lastLoadedNoteId_ = note ? note.id : null;
};

shared.showMetadata_onPress = function(comp) {
	comp.setState({ showNoteMetadata: !comp.state.showNoteMetadata });
	comp.refreshNoteMetadata(true);
};

shared.toggleIsTodo_onPress = function(comp) {
	let newNote = Note.toggleIsTodo(comp.state.note);
	let newState = { note: newNote };
	comp.setState(newState);
};

module.exports = shared;
