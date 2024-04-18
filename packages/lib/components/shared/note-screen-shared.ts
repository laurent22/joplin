import { NoteEntity } from '../../services/database/types';
import { reg } from '../../registry';
import Folder from '../../models/Folder';
import BaseModel, { ModelType } from '../../BaseModel';
import Note from '../../models/Note';
import Resource from '../../models/Resource';
import ResourceFetcher from '../../services/ResourceFetcher';
import DecryptionWorker from '../../services/DecryptionWorker';
import Setting from '../../models/Setting';
import { Mutex } from 'async-mutex';
import { itemIsReadOnlySync, ItemSlice } from '../../models/utils/readOnly';
import ItemChange from '../../models/ItemChange';
import BaseItem from '../../models/BaseItem';

export interface BaseNoteScreenComponent {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	props: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	state: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	setState: (newState: any)=> void;

	scheduleSave(): void;
	scheduleFocusUpdate(): void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	attachFile(asset: any, fileType: any): void;
	lastLoadedNoteId_?: string;
}

interface Shared {
	noteExists?: (noteId: string)=> Promise<boolean>;
	handleNoteDeletedWhileEditing_?: (note: NoteEntity)=> Promise<NoteEntity>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	saveNoteButton_press?: (comp: BaseNoteScreenComponent, folderId: string, options: any)=> Promise<void>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	saveOneProperty?: (comp: BaseNoteScreenComponent, name: string, value: any)=> void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	noteComponent_change?: (comp: BaseNoteScreenComponent, propName: string, propValue: any)=> void;
	clearResourceCache?: ()=> void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	attachedResources?: (noteBody: string)=> Promise<any>;
	isModified?: (comp: BaseNoteScreenComponent)=> boolean;
	initState?: (comp: BaseNoteScreenComponent)=> Promise<void>;
	toggleIsTodo_onPress?: (comp: BaseNoteScreenComponent)=> void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	toggleCheckboxRange?: (ipcMessage: string, noteBody: string)=> any;
	toggleCheckbox?: (ipcMessage: string, noteBody: string)=> string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	installResourceHandling?: (refreshResourceHandler: any)=> void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	uninstallResourceHandling?: (refreshResourceHandler: any)=> void;
}

const shared: Shared = {};

// If saveNoteButton_press is called multiple times in short intervals, it might result in
// the same new note being created twice, so we need to a mutex to access this function.
const saveNoteMutex_ = new Mutex();

shared.noteExists = async function(noteId: string) {
	const existingNote = await Note.load(noteId) as NoteEntity;
	return !!existingNote;
};

// Note has been deleted while user was modifying it. In that case, we
// just save a new note so that user can keep editing.
shared.handleNoteDeletedWhileEditing_ = async (note: NoteEntity) => {
	if (await shared.noteExists(note.id)) return null;

	reg.logger().info('Note has been deleted while it was being edited - recreating it.');

	let newNote = { ...note };
	delete newNote.id;
	newNote = await Note.save(newNote);

	return Note.load(newNote.id);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
shared.saveNoteButton_press = async function(comp: BaseNoteScreenComponent, folderId: string = null, options: any = null) {
	options = { autoTitle: true, ...options };

	const releaseMutex = await saveNoteMutex_.acquire();

	let note = { ...comp.state.note };

	const recreatedNote = await shared.handleNoteDeletedWhileEditing_(note);
	if (recreatedNote) note = recreatedNote;

	if (folderId) {
		note.parent_id = folderId;
	} else if (!note.parent_id) {
		const activeFolderId = Setting.value('activeFolderId');
		let folder = await Folder.load(activeFolderId);
		if (!folder) folder = await Folder.defaultFolder();
		if (!folder) return releaseMutex();
		note.parent_id = folder.id;
	}

	const isProvisionalNote = comp.props.provisionalNoteIds.includes(note.id);

	const saveOptions = {
		userSideValidation: true,
		fields: BaseModel.diffObjectsFields(comp.state.lastSavedNote, note),
	};

	const hasAutoTitle = comp.state.newAndNoTitleChangeNoteId || (isProvisionalNote && !note.title);
	if (hasAutoTitle && options.autoTitle) {
		note.title = Note.defaultTitle(note.body);
		if (saveOptions.fields && saveOptions.fields.indexOf('title') < 0) saveOptions.fields.push('title');
	}

	const savedNote = 'fields' in saveOptions && !saveOptions.fields.length ? { ...note } : await Note.save(note, saveOptions);

	const stateNote = comp.state.note;

	// Note was reloaded while being saved.
	if (!recreatedNote && (!stateNote || stateNote.id !== savedNote.id)) return releaseMutex();

	// Re-assign any property that might have changed during saving (updated_time, etc.)
	note = { ...note, ...savedNote };

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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const newState: any = {
		lastSavedNote: { ...note },
		note: note,
	};

	if (isProvisionalNote && hasAutoTitle) newState.newAndNoTitleChangeNoteId = note.id;

	if (!options.autoTitle) newState.newAndNoTitleChangeNoteId = null;

	comp.setState(newState);

	if (isProvisionalNote) {
		const updateGeoloc = async () => {
			const geoNote: NoteEntity = await Note.updateGeolocation(note.id);

			const stateNote = comp.state.note;
			if (!stateNote || !geoNote) return;
			if (stateNote.id !== geoNote.id) return; // Another note has been loaded while geoloc was being retrieved

			// Geo-location for this note has been saved to the database however the properties
			// are not in the state so set them now.

			const geoInfo = {
				longitude: geoNote.longitude,
				latitude: geoNote.latitude,
				altitude: geoNote.altitude,
			};

			const modNote = { ...stateNote, ...geoInfo };
			const modLastSavedNote = { ...comp.state.lastSavedNote, ...geoInfo };

			comp.setState({ note: modNote, lastSavedNote: modLastSavedNote });
		};

		// We don't wait because it can be done in the background
		void updateGeoloc();
	}

	releaseMutex();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
shared.saveOneProperty = async function(comp: BaseNoteScreenComponent, name: string, value: any) {
	let note = { ...comp.state.note };

	const recreatedNote = await shared.handleNoteDeletedWhileEditing_(note);
	if (recreatedNote) note = recreatedNote;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	let toSave: any = { id: note.id };
	toSave[name] = value;
	toSave = await Note.save(toSave);
	note[name] = toSave[name];

	comp.setState({
		lastSavedNote: { ...note },
		note: note,
	});
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
shared.noteComponent_change = function(comp: BaseNoteScreenComponent, propName: string, propValue: any) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const newState: any = {};

	const note = { ...comp.state.note };
	note[propName] = propValue;
	newState.note = note;

	comp.setState(newState);
	comp.scheduleSave();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
let resourceCache_: any = {};

shared.clearResourceCache = function() {
	resourceCache_ = {};
};

shared.attachedResources = async function(noteBody: string) {
	if (!noteBody) return {};
	const resourceIds = await Note.linkedItemIdsByType(BaseModel.TYPE_RESOURCE, noteBody);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const output: any = {};
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

shared.isModified = function(comp: BaseNoteScreenComponent) {
	if (!comp.state.note || !comp.state.lastSavedNote) return false;
	const diff = BaseModel.diffObjects(comp.state.lastSavedNote, comp.state.note);
	delete diff.type_;
	return !!Object.getOwnPropertyNames(diff).length;
};

shared.initState = async function(comp: BaseNoteScreenComponent) {
	const isProvisionalNote = comp.props.provisionalNoteIds.includes(comp.props.noteId);

	const note = await Note.load(comp.props.noteId);

	let mode = 'view';

	if (isProvisionalNote && !comp.props.sharedData) {
		mode = 'edit';
		comp.scheduleFocusUpdate();
	}

	const folder = Folder.byId(comp.props.folders, note.parent_id);

	comp.setState({
		lastSavedNote: { ...note },
		note: note,
		mode: mode,
		folder: folder,
		isLoading: false,
		fromShare: !!comp.props.sharedData,
		noteResources: await shared.attachedResources(note ? note.body : ''),
		readOnly: itemIsReadOnlySync(ModelType.Note, ItemChange.SOURCE_UNSPECIFIED, note as ItemSlice, Setting.value('sync.userId'), BaseItem.syncShareCache),
	});


	if (comp.props.sharedData) {
		if (comp.props.sharedData.title) {
			this.noteComponent_change(comp, 'title', comp.props.sharedData.title);
		}
		if (comp.props.sharedData.text) {
			this.noteComponent_change(comp, 'body', comp.props.sharedData.text);
		}
		if (comp.props.sharedData.resources) {
			for (let i = 0; i < comp.props.sharedData.resources.length; i++) {
				const resource = comp.props.sharedData.resources[i];
				reg.logger().info(`about to attach resource ${JSON.stringify(resource)}`);
				await comp.attachFile({
					uri: resource.uri,
					type: resource.mimeType,
					name: resource.name,
				}, null);
			}
		}
	}

	// eslint-disable-next-line require-atomic-updates
	comp.lastLoadedNoteId_ = note.id;
};

shared.toggleIsTodo_onPress = function(comp: BaseNoteScreenComponent) {
	const newNote = Note.toggleIsTodo(comp.state.note);
	const newState = { note: newNote };
	comp.setState(newState);
};

function toggleCheckboxLine(ipcMessage: string, noteBody: string) {
	const newBody = noteBody.split('\n');
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
	return [newBody, lineIndex, line];
}

shared.toggleCheckboxRange = function(ipcMessage: string, noteBody: string) {
	const [lineIndex, line] = toggleCheckboxLine(ipcMessage, noteBody).slice(1);
	const from = { line: lineIndex, ch: 0 };
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const to = { line: lineIndex, ch: (line as any).length };
	return { line, from, to };
};

shared.toggleCheckbox = function(ipcMessage: string, noteBody: string) {
	const [newBody, lineIndex, line] = toggleCheckboxLine(ipcMessage, noteBody);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	(newBody as any)[lineIndex as any] = line;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	return (newBody as any).join('\n');
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
shared.installResourceHandling = function(refreshResourceHandler: any) {
	ResourceFetcher.instance().on('downloadComplete', refreshResourceHandler);
	ResourceFetcher.instance().on('downloadStarted', refreshResourceHandler);
	DecryptionWorker.instance().on('resourceDecrypted', refreshResourceHandler);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
shared.uninstallResourceHandling = function(refreshResourceHandler: any) {
	ResourceFetcher.instance().off('downloadComplete', refreshResourceHandler);
	ResourceFetcher.instance().off('downloadStarted', refreshResourceHandler);
	DecryptionWorker.instance().off('resourceDecrypted', refreshResourceHandler);
};

export default shared;
