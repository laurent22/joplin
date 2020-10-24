const Setting = require('lib/models/Setting');
const Tag = require('lib/models/Tag');
const BaseModel = require('lib/BaseModel');
const Note = require('lib/models/Note');
const { reg } = require('lib/registry.js');
const ResourceFetcher = require('lib/services/ResourceFetcher');
const DecryptionWorker = require('lib/services/DecryptionWorker');

const reduxSharedMiddleware = async function(store, next, action) {
	const newState = store.getState();

	let refreshTags = false;

	if (action.type == 'FOLDER_SET_COLLAPSED' || action.type == 'FOLDER_TOGGLE') {
		Setting.setValue('collapsedFolderIds', newState.collapsedFolderIds);
	}

	if (action.type === 'SETTING_UPDATE_ONE' && !!action.key.match(/^sync\.\d+\.path$/)) {
		reg.resetSyncTarget();
	}

	let mustAutoAddResources = false;

	if (action.type === 'SETTING_UPDATE_ONE' && action.key === 'sync.resourceDownloadMode') {
		mustAutoAddResources = true;
	}

	if (action.type === 'DECRYPTION_WORKER_SET' && action.state === 'idle' && action.decryptedItemCounts && !!action.decryptedItemCounts[BaseModel.TYPE_NOTE]) {
		mustAutoAddResources = true;
	}

	// In general the DecryptionWorker is started via events, such as when an encrypted note
	// is received via sync, or after an encrypted has been downloaded. However, in some cases,
	// in particular when an item cannot be decrypted, the service won't retry automatically,
	// since it's not useful because the data most likely is corrupted. In some
	// cases the user might want to retry anyway, so we enable this by starting the service
	// automatically after each full sync (which is triggered when the user presses the sync
	// button, but not when a note is saved).
	if (action.type === 'SYNC_COMPLETED' && action.isFullSync) {
		DecryptionWorker.instance().scheduleStart();
	}

	if (action.type == 'NOTE_DELETE' ||
		action.type == 'NOTE_UPDATE_ONE' ||
		action.type == 'NOTE_UPDATE_ALL' ||
		action.type == 'NOTE_TAG_REMOVE' ||
		action.type == 'TAG_UPDATE_ONE') {
		refreshTags = true;
	}

	if (action.type === 'NOTE_SELECT' || action.type === 'NAV_BACK') {
		const noteIds = newState.provisionalNoteIds.slice();
		for (const noteId of noteIds) {
			if (action.id === noteId) continue;
			reg.logger().info('Provisional was not modified - deleting it');
			await Note.delete(noteId);
		}
	}

	if (action.type === 'NOTE_DELETE' ||
		action.type === 'NOTE_SELECT' ||
		action.type === 'NOTE_SELECT_TOGGLE' ||
		action.type === 'TAG_UPDATE_ONE' ||
		action.type === 'TAG_UPDATE_ALL') {
		let noteTags = [];

		// We don't need to show tags unless only one note is selected.
		// For new notes, the old note is still selected, but we don't want to show any tags.
		if (newState.selectedNoteIds &&
			newState.selectedNoteIds.length === 1) {
			noteTags = await Tag.tagsByNoteId(newState.selectedNoteIds[0]);
		}

		store.dispatch({
			type: 'SET_NOTE_TAGS',
			items: noteTags,
		});
	}

	if (mustAutoAddResources) {
		ResourceFetcher.instance().autoAddResources();
	}

	if (refreshTags) {
		store.dispatch({
			type: 'TAG_UPDATE_ALL',
			items: await Tag.allWithNotes(),
		});
	}

	// For debugging purposes: it seems in some case an empty note is saved to
	// the note array, so in that case display a log statements so that it can
	// be debugged.
	// https://discourse.joplinapp.org/t/how-to-recover-corrupted-database/9367/3?u=laurent
	if (action.type.indexOf('NOTE_') === 0) {
		for (const note of newState.notes) {
			if (!note) {
				reg.logger().error('Detected empty element in note array', action);
			}
		}
	}
};

module.exports = reduxSharedMiddleware;

