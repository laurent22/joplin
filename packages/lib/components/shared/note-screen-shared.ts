import { FolderEntity, NoteEntity, ResourceEntity, ResourceLocalStateEntity } from '../../services/database/types';
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

export interface SharedResource {
	uri: string;
	mimeType: string;
	name: string;
}

export interface SharedData {
	title: string;
	text: string;
	resources: SharedResource[];
}

export interface Props {
	provisionalNoteIds: string[];
	noteId: string;
	folders: FolderEntity[];
	sharedData: SharedData|undefined;
	noteVisiblePanes: string[];
}

export interface AttachedResource {
	item: ResourceEntity;
	localState: ResourceLocalStateEntity;
}

export type AttachedResources = Record<string, AttachedResource>;

export interface SaveNoteOptions {
	autoTitle?: boolean;
}

export interface BaseState {
	note: NoteEntity;
	lastSavedNote: NoteEntity;
	newAndNoTitleChangeNoteId: boolean;
	mode: string;
	folder: FolderEntity;
	isLoading: boolean;
	fromShare: boolean;
	noteResources: AttachedResources;
	readOnly: boolean;
	noteLastLoadTime: number;
}

export interface AttachFileAsset {
	uri: string;
	type?: string;
	fileName?: string;
}

export interface BaseNoteScreenComponent<State extends BaseState = BaseState> {
	props: Props;
	state: State;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Implemented by React components whose `setState` accepts a state object or updater function; the React signature isn't expressible structurally here
	setState(state: any): void;

	// To prevent race conditions, scheduleSave takes a snapshot of the
	// current state. Previously, the delay between calling setState(state) and
	// this.state getting the new state value could cause the wrong state
	// to be saved.
	scheduleSave(currentState: State): void;
	scheduleFocusUpdate(): void;
	attachFile(asset: AttachFileAsset, fileType: string | null): void;
	lastLoadedNoteId_?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Forwarded to EventEmitter.on/off which receive heterogeneous event payloads; callers like Note.tsx pass concrete signatures
type ResourceHandler = (...args: any[])=> void | Promise<void>;

interface Shared {
	noteExists?: (noteId: string)=> Promise<boolean>;
	handleNoteDeletedWhileEditing_?: (note: NoteEntity)=> Promise<NoteEntity>;
	saveNoteButton_press?: (comp: BaseNoteScreenComponent, state: BaseState, folderId: string, options: SaveNoteOptions)=> Promise<void>;
	saveOneProperty?: (comp: BaseNoteScreenComponent, name: string, value: unknown)=> void;
	noteComponent_change?: (comp: BaseNoteScreenComponent, propName: string, propValue: unknown)=> void;
	clearResourceCache?: ()=> void;
	attachedResources?: (noteBody: string)=> Promise<AttachedResources>;
	isModified?: (comp: BaseNoteScreenComponent)=> boolean;
	initState?: (comp: BaseNoteScreenComponent)=> Promise<void>;
	toggleIsTodo_onPress?: (comp: BaseNoteScreenComponent)=> NoteEntity;
	toggleCheckboxRange?: (ipcMessage: string, noteBody: string)=> { line: string; from: { line: number; ch: number }; to: { line: number; ch: number } } | string;
	toggleCheckbox?: (ipcMessage: string, noteBody: string)=> string;
	installResourceHandling?: (refreshResourceHandler: ResourceHandler)=> void;
	uninstallResourceHandling?: (refreshResourceHandler: ResourceHandler)=> void;

	reloadNote?: (comp: BaseNoteScreenComponent)=> Promise<NoteEntity>;
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

shared.saveNoteButton_press = async function(comp: BaseNoteScreenComponent, state: BaseState, folderId: string = null, options: SaveNoteOptions = null) {
	options = { autoTitle: true, ...options };
	state = { ...comp.state, ...state };

	const releaseMutex = await saveNoteMutex_.acquire();

	let note = { ...state.note };

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
		fields: BaseModel.diffObjectsFields(state.lastSavedNote, note),
		dispatchOptions: { preserveSelection: true },
	};

	const hasAutoTitle = state.newAndNoTitleChangeNoteId || (isProvisionalNote && !note.title);
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
		// But we preserve the current title, body and todo_completed because
		// the user might have changed them between the time
		// saveNoteButton_press was called and the note was
		// saved (it's done asynchronously).
		//
		// If the title was auto-assigned above, we don't restore
		// it from the state because it will be empty there.
		if (!hasAutoTitle) note.title = stateNote.title;
		note.body = stateNote.body;
		note.todo_completed = stateNote.todo_completed;
	}

	const newState: Partial<BaseState> = {
		lastSavedNote: { ...note, ...savedNote },
		note: note,
	};

	if (isProvisionalNote && hasAutoTitle) newState.newAndNoTitleChangeNoteId = true;

	if (!options.autoTitle) newState.newAndNoTitleChangeNoteId = null;

	comp.setState(newState);

	if (isProvisionalNote) {
		const updateGeoloc = async () => {
			const geoNote: NoteEntity = await Note.updateGeolocation(note.id);

			// Read the latest state (not the closure `state`, which was captured
			// before Note.save and doesn't include the auto-derived title).
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

shared.saveOneProperty = async function(comp: BaseNoteScreenComponent, name: string, value: unknown) {
	let note = { ...comp.state.note };

	const recreatedNote = await shared.handleNoteDeletedWhileEditing_(note);
	if (recreatedNote) note = recreatedNote;

	const toSave: Record<string, unknown> = { id: note.id };
	toSave[name] = value;
	const saved = await Note.save(toSave) as Record<string, unknown>;
	(note as Record<string, unknown>)[name] = saved[name];

	comp.setState({
		lastSavedNote: { ...note, ...saved },
		note: note,
	});
};

shared.noteComponent_change = function(comp: BaseNoteScreenComponent, propName: string, propValue: unknown) {
	const newState: Partial<BaseState> = {};

	const note = { ...comp.state.note };
	(note as Record<string, unknown>)[propName] = propValue;
	newState.note = note;

	comp.setState(newState);
	comp.scheduleSave(newState as BaseState);
};

let resourceCache_: AttachedResources = {};

shared.clearResourceCache = function() {
	resourceCache_ = {};
};

shared.attachedResources = async function(noteBody: string) {
	if (!noteBody) return {};
	const resourceIds = await Note.linkedItemIdsByType(BaseModel.TYPE_RESOURCE, noteBody);

	const output: AttachedResources = {};
	for (let i = 0; i < resourceIds.length; i++) {
		const id = resourceIds[i];

		if (resourceCache_[id]) {
			output[id] = resourceCache_[id];
		} else {
			const resource = await Resource.load(id);
			const localState = await Resource.localState(resource);

			const o: AttachedResource = {
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

shared.reloadNote = async (comp: BaseNoteScreenComponent) => {
	const isProvisionalNote = comp.props.provisionalNoteIds.includes(comp.props.noteId);

	const note = await Note.load(comp.props.noteId);

	const panes = comp.props.noteVisiblePanes;
	let mode = panes.includes('editor') ? 'edit' : 'view';

	// Override the mode if the default state is not last
	const defaultState = Setting.value('editor.mobile.defaultEditState');
	if (defaultState === 'view') mode = 'view';
	if (defaultState === 'edit') mode = 'edit';

	// Prevent trashed notes and notes created via sharing from opening in edit mode.
	if (note?.deleted_time || comp.props.sharedData) {
		mode = 'view';
	}

	if (isProvisionalNote && !comp.props.sharedData) {
		mode = 'edit';
		comp.scheduleFocusUpdate();
	}

	const fromShare = !!comp.props.sharedData;
	if (note) {
		let folder = Folder.byId(comp.props.folders, note.parent_id);
		if (!folder && note.parent_id) {
			folder = await Folder.load(note.parent_id);
		}
		comp.setState({
			lastSavedNote: { ...note },
			note: note,
			mode: mode,
			folder: folder,
			isLoading: false,
			fromShare: !!comp.props.sharedData,
			noteResources: await shared.attachedResources(note ? note.body : ''),
			readOnly: itemIsReadOnlySync(ModelType.Note, ItemChange.SOURCE_UNSPECIFIED, note as ItemSlice, Setting.value('sync.userId'), BaseItem.syncShareCache),
			noteLastLoadTime: Date.now(),
		});
	} else {
		// Handle the case where a non-existent note is loaded. This can happen briefly after deleting a note.
		comp.setState({
			lastSavedNote: {},
			note: {},
			mode,
			folder: null,
			isLoading: true,
			fromShare,
			noteResources: {},
			readOnly: true,
			noteLastLoadTime: Date.now(),
		});
	}

	return note;
};

shared.initState = async function(comp: BaseNoteScreenComponent) {
	const note = await shared.reloadNote(comp);

	// Ensure that only empty notes created for shared content are populated with sharedData, because in some cases
	// existing notes can be overwritten by the shared data. See https://github.com/laurent22/joplin/issues/11479
	if (comp.props.sharedData && note && note.title.length === 0 && note.body.length === 0) {
		// Use the note returned by reloadNote directly to avoid a race condition where
		// comp.state.note is still the initial empty note (Note.new() with parent_id='')
		// because React hasn't flushed reloadNote's setState yet. Without this, the
		// scheduled save would overwrite parent_id with an empty string in the DB.
		const updatedNote = { ...note };
		const fieldsToSave: NoteEntity = { id: note.id };
		if (comp.props.sharedData.title) {
			updatedNote.title = comp.props.sharedData.title;
			fieldsToSave.title = comp.props.sharedData.title;
		}
		if (comp.props.sharedData.text) {
			updatedNote.body = comp.props.sharedData.text;
			fieldsToSave.body = comp.props.sharedData.text;
		}
		if (fieldsToSave.title !== undefined || fieldsToSave.body !== undefined) {
			await Note.save(fieldsToSave);
			comp.setState({ note: updatedNote, lastSavedNote: { ...updatedNote } });
		}
		if (comp.props.sharedData.resources) {
			for (let i = 0; i < comp.props.sharedData.resources.length; i++) {
				const resource = comp.props.sharedData.resources[i];
				reg.logger().info(`about to attach resource ${JSON.stringify(resource)}`);
				await comp.attachFile({
					uri: resource.uri,
					type: resource.mimeType,
					fileName: resource.name,
				}, null);
			}
		}
	}

	// eslint-disable-next-line require-atomic-updates
	comp.lastLoadedNoteId_ = note?.id;
};

shared.toggleIsTodo_onPress = function(comp: BaseNoteScreenComponent) {
	return Note.toggleIsTodo(comp.state.note);
};

type ToggleCheckboxResult = string | [string[], number, string];

function toggleCheckboxLine(ipcMessage: string, noteBody: string): ToggleCheckboxResult {
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
	const result = toggleCheckboxLine(ipcMessage, noteBody);
	if (typeof result === 'string') return result;
	const [, lineIndex, line] = result;
	const from = { line: lineIndex, ch: 0 };
	const to = { line: lineIndex, ch: line.length };
	return { line, from, to };
};

shared.toggleCheckbox = function(ipcMessage: string, noteBody: string) {
	const result = toggleCheckboxLine(ipcMessage, noteBody);
	if (typeof result === 'string') return result;
	const [newBody, lineIndex, line] = result;
	newBody[lineIndex] = line;
	return newBody.join('\n');
};

shared.installResourceHandling = function(refreshResourceHandler: ResourceHandler) {
	ResourceFetcher.instance().on('downloadComplete', refreshResourceHandler);
	ResourceFetcher.instance().on('downloadStarted', refreshResourceHandler);
	DecryptionWorker.instance().on('resourceDecrypted', refreshResourceHandler);
};

shared.uninstallResourceHandling = function(refreshResourceHandler: ResourceHandler) {
	ResourceFetcher.instance().off('downloadComplete', refreshResourceHandler);
	ResourceFetcher.instance().off('downloadStarted', refreshResourceHandler);
	DecryptionWorker.instance().off('resourceDecrypted', refreshResourceHandler);
};

export default shared;
