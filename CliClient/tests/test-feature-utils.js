/* eslint-disable no-unused-vars */
const { setupDatabaseAndSynchronizer, switchClient, asyncTest, checkThrowAsync, id, ids, sortedIds, at, createNTestNotes, createNTestFolders, createNTestTags, createNTestTodos } = require('test-utils.js');

const { BaseApplication } = require('lib/BaseApplication.js');
const BaseModel = require('lib/BaseModel.js');
const Setting = require('lib/models/Setting.js');
const ItemChange = require('lib/models/ItemChange.js');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const { uuid } = require('lib/uuid.js');
const { time } = require('lib/time-utils.js');

const { ALL_NOTES_FILTER_ID, TRASH_FILTER_ID, TRASH_TAG_ID, TRASH_TAG_NAME, ORPHANS_FOLDER_ID, CONFLICT_FOLDER_ID } = require('lib/reserved-ids.js');


// Application for feature integration testing
class TestApp extends BaseApplication {
	constructor(hasGui = true) {
		super();
		this.hasGui_ = hasGui;
		this.middlewareCalls_ = [];
		this.logger_ = super.logger();
	}

	hasGui() {
		return this.hasGui_;
	}

	async start(argv) {
		this.logger_.info('Test app starting...');

		if (!argv.includes('--profile')) {
			argv = argv.concat(['--profile', `tests-build/profile/${uuid.create()}`]);
		}
		argv = await super.start(['',''].concat(argv));

		// For now, disable sync and encryption to avoid spurious intermittent failures
		// caused by them interupting processing and causing delays.
		Setting.setValue('sync.interval', 0);
		Setting.setValue('encryption.enabled', false);

		this.initRedux();
		Setting.dispatchUpdateAll();
		await ItemChange.waitForAllSaved();
		await this.wait();

		this.logger_.info('Test app started...');
	}

	async generalMiddleware(store, next, action) {
		this.middlewareCalls_.push(true);
		try {
			await super.generalMiddleware(store, next, action);
		} finally {
			this.middlewareCalls_.pop();
		}
	}

	async wait() {
		return new Promise((resolve) => {
			const iid = setInterval(() => {
				if (!this.middlewareCalls_.length) {
					clearInterval(iid);
					resolve();
				}
			}, 100);
		});
	}

	async profileDir() {
		return await Setting.value('profileDir');
	}

	async destroy() {
		this.logger_.info('Test app stopping...');
		await this.wait();
		await ItemChange.waitForAllSaved();
		this.deinitRedux();
		await super.destroy();
		await time.msleep(100);
	}
}

// High level test actions that mimic front end implementations
class actions {
	static setApp(app) {
		this.app = app;
	}

	static async viewFilter(filterId) {
		this.app.dispatch({ type: 'SMART_FILTER_SELECT', id: filterId });
		await this.app.wait();
	}

	static async viewFolder(folderId) {
		const state = this.app.store().getState();
		expect(ids(state.folders).includes(folderId)).toBe(true);
		this.app.dispatch({ type: 'FOLDER_SELECT', id: folderId });
		await this.app.wait();
	}

	static async selectNotes(noteIds) {
		const state = this.app.store().getState();
		expect(noteIds.filter(x => !ids(state.notes).includes(x)).length).toEqual(0);
		this.app.dispatch({ type: 'NOTE_SELECT',	id: noteIds[0] });
		await this.app.wait();
		for (let i = 1; i < noteIds.length; i++) {
			this.app.dispatch({ type: 'NOTE_SELECT_ADD', id: noteIds[i] });
			await this.app.wait();
		}
	}

	static async awaitReindexing() {
		await time.msleep(11000);
		await this.app.wait();
	}

	static async awaitNoteCounts() {
		await time.msleep(1100);
		await this.app.wait();
	}

	static async awaitFoldersRefresh() {
		await time.msleep(1100);
		await this.app.wait();
	}

	static async moveSelectedNotesToFolder(folderId) {
		const state = this.app.store().getState();
		expect(ids(state.folders).includes(folderId)).toBe(true);
		expect(!!state.selectedNoteIds && state.selectedNoteIds.length > 0);
		for (let i = 0; i < state.selectedNoteIds.length; i++) {
			await Note.moveToFolder(state.selectedNoteIds[i], folderId);
		}
		await this.app.wait();
	}

	// Delete is not permanent, ie move to trash
	static async deleteSelectedNotes() {
		const state = this.app.store().getState();
		expect(!!state.selectedNoteIds && state.selectedNoteIds.length > 0);
		await Note.batchDelete(state.selectedNoteIds, { permanent: false });
		await this.app.wait();
	}

	static async deleteUnselectedNote(noteId) {
		const state = this.app.store().getState();
		expect(ids(state.notes).includes(noteId)).toBe(true);
		expect(state.selectedNoteIds.includes(noteId)).toBe(false);
		await Note.batchDelete([noteId], { permanent: false });
		await this.app.wait();
	}

	// This is permanent deletion, ie bypass trash
	static async permanentlyDeleteSelectedNotes() {
		const state = this.app.store().getState();
		expect(!!state.selectedNoteIds && state.selectedNoteIds.length > 0);
		await Note.batchDelete(state.selectedNoteIds, { permanent: true });
		await this.app.wait();
	}

	static async restoreSelectedNotes() {
		const state = this.app.store().getState();
		expect(!!state.selectedNoteIds && state.selectedNoteIds.length > 0);
		await Note.undelete(state.selectedNoteIds);
		await this.app.wait();
	}

	static async restoreUnselectedNote(noteId) {
		const state = this.app.store().getState();
		expect(ids(state.notes).includes(noteId)).toBe(true);
		expect(state.selectedNoteIds.includes(noteId)).toBe(false);
		await Note.undelete([noteId]);
		await this.app.wait();
	}

	// Delete is not permanent, ie move to trash
	static async deleteSelectedFolder() {
		const state = this.app.store().getState();
		await Folder.delete(state.selectedFolderId, { permanent: false });
		await this.app.wait();
	}

	// This is permanent deletion, ie bypass trash
	static async permanentlyDeleteSelectedFolder() {
		const state = this.app.store().getState();
		await Folder.delete(state.selectedFolderId, { permanent: true });
		await this.app.wait();
	}

	static async deleteUnselectedFolder(folderId) {
		const state = this.app.store().getState();
		expect(ids(state.folders).includes(folderId)).toBe(true);
		await Folder.delete(folderId, { permanent: false });
		await this.app.wait();
	}

	static async permanentlyDeleteUnselectedFolder(folderId) {
		const state = this.app.store().getState();
		expect(ids(state.folders).includes(folderId)).toBe(true);
		await Folder.delete(folderId, { permanent: true });
		await this.app.wait();
	}

	static async searchNotesByTitle(title) {
		this.app.dispatch({
			type: 'SEARCH_UPDATE',
			search: {
				id: uuid.create(),
				title: title,
				query_pattern: title,
				query_folder_id: null,
				type_: BaseModel.TYPE_SEARCH,
			},
		});
		await this.app.wait();
	}
}

module.exports = { TestApp, actions };
