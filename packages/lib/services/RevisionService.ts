import ItemChange from '../models/ItemChange';
import Note from '../models/Note';
import Folder from '../models/Folder';
import Setting from '../models/Setting';
import Revision from '../models/Revision';
import BaseModel from '../BaseModel';
import ItemChangeUtils from './ItemChangeUtils';
import shim from '../shim';
import BaseService from './BaseService';
import { _ } from '../locale';
import { ItemChangeEntity, NoteEntity, RevisionEntity } from './database/types';
const { sprintf } = require('sprintf-js');
const { wrapError } = require('../errorUtils');

export default class RevisionService extends BaseService {

	public static instance_: RevisionService;

	// An "old note" is one that has been created before the revision service existed. These
	// notes never benefited from revisions so the first time they are modified, a copy of
	// the original note is saved. The goal is to have at least one revision in case the note
	// is deleted or modified as a result of a bug or user mistake.
	private isOldNotesCache_: any = {};
	private maintenanceCalls_: any[] = [];
	private maintenanceTimer1_: any = null;
	private maintenanceTimer2_: any = null;
	private isCollecting_ = false;
	public isRunningInBackground_ = false;

	static instance() {
		if (this.instance_) return this.instance_;
		this.instance_ = new RevisionService();
		return this.instance_;
	}

	oldNoteCutOffDate_() {
		return Date.now() - Setting.value('revisionService.oldNoteInterval');
	}

	async isOldNote(noteId: string) {
		if (noteId in this.isOldNotesCache_) return this.isOldNotesCache_[noteId];

		const isOld = await Note.noteIsOlderThan(noteId, this.oldNoteCutOffDate_());
		this.isOldNotesCache_[noteId] = isOld;
		return isOld;
	}

	noteMetadata_(note: NoteEntity) {
		const excludedFields = ['type_', 'title', 'body', 'created_time', 'updated_time', 'encryption_applied', 'encryption_cipher_text', 'is_conflict'];
		const md: any = {};
		for (const k in note) {
			if (excludedFields.indexOf(k) >= 0) continue;
			md[k] = (note as any)[k];
		}

		if (note.user_updated_time === note.updated_time) delete md.user_updated_time;
		if (note.user_created_time === note.created_time) delete md.user_created_time;

		return md;
	}

	isEmptyRevision_(rev: RevisionEntity) {
		if (rev.title_diff) return false;
		if (rev.body_diff) return false;

		const md = JSON.parse(rev.metadata_diff);
		if (md.new && Object.keys(md.new).length) return false;
		if (md.deleted && Object.keys(md.deleted).length) return false;

		return true;
	}

	async createNoteRevision_(note: NoteEntity, parentRevId: string = null) {
		try {
			const parentRev = parentRevId ? await Revision.load(parentRevId) : await Revision.latestRevision(BaseModel.TYPE_NOTE, note.id);

			const output: RevisionEntity = {
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
		} catch (error) {
			const newError = wrapError(`Could not create revision for note: ${note.id}`, error);
			throw newError;
		}
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
				const changes: ItemChangeEntity[] = await ItemChange.modelSelectAll(
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

				const noteIds = changes.map((a) => a.item_id);
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

	async deleteOldRevisions(ttl: number) {
		return Revision.deleteOldRevisions(ttl);
	}

	async revisionNote(revisions: RevisionEntity[], index: number) {
		if (index < 0 || index >= revisions.length) throw new Error(`Invalid revision index: ${index}`);

		const rev = revisions[index];
		const merged = await Revision.mergeDiffs(rev, revisions);

		const output: NoteEntity = Object.assign(
			{
				title: merged.title,
				body: merged.body,
			},
			merged.metadata
		);
		output.updated_time = output.user_updated_time;
		output.created_time = output.user_created_time;
		(output as any).type_ = BaseModel.TYPE_NOTE;

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

	async importRevisionNote(note: NoteEntity) {
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
		this.maintenanceCalls_.push(true);
		try {
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

				this.logger().info(`RevisionService::maintenance: Done in ${Date.now() - startTime}ms`);
			}
		} finally {
			this.maintenanceCalls_.pop();
		}
	}

	runInBackground(collectRevisionInterval: number = null) {
		if (this.isRunningInBackground_) return;
		this.isRunningInBackground_ = true;

		if (collectRevisionInterval === null) collectRevisionInterval = 1000 * 60 * 10;

		this.logger().info(`RevisionService::runInBackground: Starting background service with revision collection interval ${collectRevisionInterval}`);

		this.maintenanceTimer1_ = shim.setTimeout(() => {
			void this.maintenance();
		}, 1000 * 4);

		this.maintenanceTimer2_ = shim.setInterval(() => {
			void this.maintenance();
		}, collectRevisionInterval);
	}

	async cancelTimers() {
		if (this.maintenanceTimer1_) {
			shim.clearTimeout(this.maintenanceTimer1_);
			this.maintenanceTimer1_ = null;
		}
		if (this.maintenanceTimer2_) {
			shim.clearInterval(this.maintenanceTimer2_);
			this.maintenanceTimer2_ = null;
		}

		return new Promise((resolve) => {
			const iid = shim.setInterval(() => {
				if (!this.maintenanceCalls_.length) {
					shim.clearInterval(iid);
					resolve(null);
				}
			}, 100);
		});
	}
}
