const ItemChange = require('lib/models/ItemChange');
const Note = require('lib/models/Note');
const Folder = require('lib/models/Folder');
const Setting = require('lib/models/Setting');
const Revision = require('lib/models/Revision');
const BaseModel = require('lib/BaseModel');
const ItemChangeUtils = require('lib/services/ItemChangeUtils');
const { shim } = require('lib/shim');
const BaseService = require('lib/services/BaseService');
const { _ } = require('lib/locale.js');
const { sprintf } = require('sprintf-js');

class RevisionService extends BaseService {
	constructor() {
		super();

		// An "old note" is one that has been created before the revision service existed. These
		// notes never benefited from revisions so the first time they are modified, a copy of
		// the original note is saved. The goal is to have at least one revision in case the note
		// is deleted or modified as a result of a bug or user mistake.
		this.isOldNotesCache_ = {};
	}

	static instance() {
		if (this.instance_) return this.instance_;
		this.instance_ = new RevisionService();
		return this.instance_;
	}

	oldNoteCutOffDate_() {
		return Date.now() - Setting.value('revisionService.oldNoteInterval');
	}

	async isOldNote(noteId) {
		if (noteId in this.isOldNotesCache_) return this.isOldNotesCache_[noteId];

		const isOld = await Note.noteIsOlderThan(noteId, this.oldNoteCutOffDate_());
		this.isOldNotesCache_[noteId] = isOld;
		return isOld;
	}

	noteMetadata_(note) {
		const excludedFields = ['type_', 'title', 'body', 'created_time', 'updated_time', 'encryption_applied', 'encryption_cipher_text', 'is_conflict'];
		const md = {};
		for (let k in note) {
			if (excludedFields.indexOf(k) >= 0) continue;
			md[k] = note[k];
		}

		if (note.user_updated_time === note.updated_time) delete md.user_updated_time;
		if (note.user_created_time === note.created_time) delete md.user_created_time;

		return md;
	}

	isEmptyRevision_(rev) {
		if (rev.title_diff) return false;
		if (rev.body_diff) return false;

		const md = JSON.parse(rev.metadata_diff);
		if (md.new && Object.keys(md.new).length) return false;
		if (md.deleted && Object.keys(md.deleted).length) return false;

		return true;
	}

	async createNoteRevision_(note, parentRevId = null) {
		const parentRev = parentRevId ? await Revision.load(parentRevId) : await Revision.latestRevision(BaseModel.TYPE_NOTE, note.id);

		const output = {
			parent_id: '',
			item_type: BaseModel.TYPE_NOTE,
			item_id: note.id,
			item_updated_time: note.updated_time,
		};

		const noteMd = this.noteMetadata_(note);
		const noteTitle = note.title ? note.title : '';
		const noteBody = note.body ? note.body : '';

		if (!parentRev) {
			output.title_diff = Revision.createTextPatch('', noteTitle);
			output.body_diff = Revision.createTextPatch('', noteBody);
			output.metadata_diff = Revision.createObjectPatch({}, noteMd);
		} else {
			if (Date.now() - parentRev.updated_time < Setting.value('revisionService.intervalBetweenRevisions')) return null;

			const merged = await Revision.mergeDiffs(parentRev);
			output.parent_id = parentRev.id;
			output.title_diff = Revision.createTextPatch(merged.title, noteTitle);
			output.body_diff = Revision.createTextPatch(merged.body, noteBody);
			output.metadata_diff = Revision.createObjectPatch(merged.metadata, noteMd);
		}

		if (this.isEmptyRevision_(output)) return null;

		return Revision.save(output);
	}

	async collectRevisions() {
		if (this.isCollecting_) return;

		this.isCollecting_ = true;

		await ItemChange.waitForAllSaved();

		const doneNoteIds = [];

		try {
			while (true) {
				// See synchronizer test units to see why changes coming
				// from sync are skipped.
				const changes = await ItemChange.modelSelectAll(
					`
					SELECT id, item_id, type, before_change_item
					FROM item_changes
					WHERE item_type = ?
					AND source != ?
					AND source != ?
					AND id > ?
					ORDER BY id ASC
					LIMIT 10
				`,
					[BaseModel.TYPE_NOTE, ItemChange.SOURCE_SYNC, ItemChange.SOURCE_DECRYPTION, Setting.value('revisionService.lastProcessedChangeId')]
				);

				if (!changes.length) break;

				const noteIds = changes.map(a => a.item_id);
				const notes = await Note.modelSelectAll(`SELECT * FROM notes WHERE is_conflict = 0 AND encryption_applied = 0 AND id IN ("${noteIds.join('","')}")`);

				for (let i = 0; i < changes.length; i++) {
					const change = changes[i];
					const noteId = change.item_id;

					if (change.type === ItemChange.TYPE_UPDATE && doneNoteIds.indexOf(noteId) < 0) {
						const note = BaseModel.byId(notes, noteId);
						const oldNote = change.before_change_item ? JSON.parse(change.before_change_item) : null;

						if (note) {
							if (oldNote && oldNote.updated_time < this.oldNoteCutOffDate_()) {
								// This is where we save the original version of this old note
								const rev = await this.createNoteRevision_(oldNote);
								if (rev) this.logger().debug(sprintf('RevisionService::collectRevisions: Saved revision %s (old note)', rev.id));
							}

							const rev = await this.createNoteRevision_(note);
							if (rev) this.logger().debug(sprintf('RevisionService::collectRevisions: Saved revision %s (Last rev was more than %d ms ago)', rev.id, Setting.value('revisionService.intervalBetweenRevisions')));
							doneNoteIds.push(noteId);
							this.isOldNotesCache_[noteId] = false;
						}
					}

					if (change.type === ItemChange.TYPE_DELETE && !!change.before_change_item) {
						const note = JSON.parse(change.before_change_item);
						const revExists = await Revision.revisionExists(BaseModel.TYPE_NOTE, note.id, note.updated_time);
						if (!revExists) {
							const rev = await this.createNoteRevision_(note);
							if (rev) this.logger().debug(sprintf('RevisionService::collectRevisions: Saved revision %s (for deleted note)', rev.id));
						}
						doneNoteIds.push(noteId);
					}

					Setting.setValue('revisionService.lastProcessedChangeId', change.id);
				}
			}
		} catch (error) {
			if (error.code === 'revision_encrypted') {
				// One or more revisions are encrypted - stop processing for now
				// and these revisions will be processed next time the revision
				// collector runs.
				this.logger().info('RevisionService::collectRevisions: One or more revision was encrypted. Processing was stopped but will resume later when the revision is decrypted.', error);
			} else {
				this.logger().error('RevisionService::collectRevisions:', error);
			}
		}

		await Setting.saveAll();
		await ItemChangeUtils.deleteProcessedChanges();

		this.isCollecting_ = false;

		this.logger().info(`RevisionService::collectRevisions: Created revisions for ${doneNoteIds.length} notes`);
	}

	async deleteOldRevisions(ttl) {
		return Revision.deleteOldRevisions(ttl);
	}

	async revisionNote(revisions, index) {
		if (index < 0 || index >= revisions.length) throw new Error(`Invalid revision index: ${index}`);

		const rev = revisions[index];
		const merged = await Revision.mergeDiffs(rev, revisions);

		const output = Object.assign(
			{
				title: merged.title,
				body: merged.body,
			},
			merged.metadata
		);
		output.updated_time = output.user_updated_time;
		output.created_time = output.user_created_time;
		output.type_ = BaseModel.TYPE_NOTE;

		return output;
	}

	restoreFolderTitle() {
		return _('Restored Notes');
	}

	async restoreFolder() {
		let folder = await Folder.loadByTitle(this.restoreFolderTitle());
		if (!folder) {
			folder = await Folder.save({ title: this.restoreFolderTitle() });
		}
		return folder;
	}

	async importRevisionNote(note) {
		const toImport = Object.assign({}, note);
		delete toImport.id;
		delete toImport.updated_time;
		delete toImport.created_time;
		delete toImport.encryption_applied;
		delete toImport.encryption_cipher_text;

		const folder = await this.restoreFolder();

		toImport.parent_id = folder.id;

		await Note.save(toImport);
	}

	async maintenance() {
		const startTime = Date.now();
		this.logger().info('RevisionService::maintenance: Starting...');

		if (!Setting.value('revisionService.enabled')) {
			this.logger().info('RevisionService::maintenance: Service is disabled');
			// We do as if we had processed all the latest changes so that they can be cleaned up
			// later on by ItemChangeUtils.deleteProcessedChanges().
			Setting.setValue('revisionService.lastProcessedChangeId', await ItemChange.lastChangeId());
			await this.deleteOldRevisions(Setting.value('revisionService.ttlDays') * 24 * 60 * 60 * 1000);
		} else {
			this.logger().info('RevisionService::maintenance: Service is enabled');
			await this.collectRevisions();
			await this.deleteOldRevisions(Setting.value('revisionService.ttlDays') * 24 * 60 * 60 * 1000);
		}

		this.logger().info(`RevisionService::maintenance: Done in ${Date.now() - startTime}ms`);
	}

	runInBackground(collectRevisionInterval = null) {
		if (this.isRunningInBackground_) return;
		this.isRunningInBackground_ = true;

		if (collectRevisionInterval === null) collectRevisionInterval = 1000 * 60 * 10;

		this.logger().info(`RevisionService::runInBackground: Starting background service with revision collection interval ${collectRevisionInterval}`);

		setTimeout(() => {
			this.maintenance();
		}, 1000 * 4);

		shim.setInterval(() => {
			this.maintenance();
		}, collectRevisionInterval);
	}
}

module.exports = RevisionService;
