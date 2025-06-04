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
import Logger from '@joplin/utils/Logger';
import { MarkupLanguage } from '../../renderer';
const { substrWithEllipsis } = require('../string-utils');
const { sprintf } = require('sprintf-js');
const { wrapError } = require('../errorUtils');

const logger = Logger.create('RevisionService');

export default class RevisionService extends BaseService {

	public static instance_: RevisionService;

	// An "old note" is one that has been created before the revision service existed. These
	// notes never benefited from revisions so the first time they are modified, a copy of
	// the original note is saved. The goal is to have at least one revision in case the note
	// is deleted or modified as a result of a bug or user mistake.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private isOldNotesCache_: any = {};
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private maintenanceCalls_: any[] = [];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private maintenanceTimer1_: any = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private maintenanceTimer2_: any = null;
	private isCollecting_ = false;
	public isRunningInBackground_ = false;

	public static instance() {
		if (this.instance_) return this.instance_;
		this.instance_ = new RevisionService();
		return this.instance_;
	}

	public oldNoteCutOffDate_() {
		return Date.now() - Setting.value('revisionService.oldNoteInterval');
	}

	public async isOldNote(noteId: string) {
		if (noteId in this.isOldNotesCache_) return this.isOldNotesCache_[noteId];

		const isOld = await Note.noteIsOlderThan(noteId, this.oldNoteCutOffDate_());
		this.isOldNotesCache_[noteId] = isOld;
		return isOld;
	}

	private noteMetadata_(note: NoteEntity) {
		const excludedFields = ['type_', 'title', 'body', 'created_time', 'updated_time', 'encryption_applied', 'encryption_cipher_text', 'is_conflict'];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const md: any = {};
		for (const k in note) {
			if (excludedFields.indexOf(k) >= 0) continue;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			md[k] = (note as any)[k];
		}

		if (note.user_updated_time === note.updated_time) delete md.user_updated_time;
		if (note.user_created_time === note.created_time) delete md.user_created_time;

		return md;
	}

	public async createNoteRevision_(note: NoteEntity, parentRevId: string = null): Promise<RevisionEntity> {
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

			if (Revision.isEmptyRevision(output)) return null;

			return Revision.save(output);
		} catch (error) {
			const newError = wrapError(`Could not create revision for note: ${note.id}`, error);
			throw newError;
		}
	}

	public async collectRevisions() {
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
					[BaseModel.TYPE_NOTE, ItemChange.SOURCE_SYNC, ItemChange.SOURCE_DECRYPTION, Setting.value('revisionService.lastProcessedChangeId')],
				);

				if (!changes.length) break;

				const noteIds = changes.map((a) => a.item_id);
				const notes = await Note.modelSelectAll(`SELECT * FROM notes WHERE is_conflict = 0 AND encryption_applied = 0 AND id IN (${
					Note.escapeIdsForSql(noteIds)
				})`);

				for (let i = 0; i < changes.length; i++) {
					const change = changes[i];
					const noteId = change.item_id;

					try {
						if (change.type === ItemChange.TYPE_UPDATE && doneNoteIds.indexOf(noteId) < 0) {
							const note = BaseModel.byId(notes, noteId);
							const oldNote = change.before_change_item ? JSON.parse(change.before_change_item) : null;

							if (note) {
								if (oldNote && oldNote.updated_time < this.oldNoteCutOffDate_()) {
									// This is where we save the original version of this old note
									const rev = await this.createNoteRevision_(oldNote);
									if (rev) logger.debug(sprintf('collectRevisions: Saved revision %s (old note)', rev.id));
								}

								const rev = await this.createNoteRevision_(note);
								if (rev) logger.debug(sprintf('collectRevisions: Saved revision %s (Last rev was more than %d ms ago)', rev.id, Setting.value('revisionService.intervalBetweenRevisions')));
								doneNoteIds.push(noteId);
								this.isOldNotesCache_[noteId] = false;
							}
						}

						if (change.type === ItemChange.TYPE_DELETE && !!change.before_change_item) {
							const note = JSON.parse(change.before_change_item);
							const revExists = await Revision.revisionExists(BaseModel.TYPE_NOTE, note.id, note.updated_time);
							if (!revExists) {
								const rev = await this.createNoteRevision_(note);
								if (rev) logger.debug(sprintf('collectRevisions: Saved revision %s (for deleted note)', rev.id));
							}
							doneNoteIds.push(noteId);
						}
					} catch (error) {
						if (error.code === 'revision_encrypted') {
							throw error;
						} else {
							// If any revision creation fails, we continue
							// processing the other changes. It seems a rare bug
							// in diff-match-patch can cause the creation of
							// revisions to fail in some case. It should be rare
							// and it's best to continue processing the other
							// changes. The alternative would be to stop here
							// and fix the bug, but in the meantime revisions
							// will no longer be generated.

							// The drawback is that once a change has been
							// skipped it will never be processed again because
							// the error will be in the past (before
							// revisionService.lastProcessedChangeId)
							//
							// https://github.com/laurent22/joplin/issues/5531
							logger.error(`collectRevisions: Processing one of the changes for note ${noteId} failed. Other changes will still be processed. Error was: `, error);
							logger.error('collectRevisions: Change was:', change);
						}
					}

					Setting.setValue('revisionService.lastProcessedChangeId', change.id);
				}
			}
		} catch (error) {
			if (error.code === 'revision_encrypted') {
				// One or more revisions are encrypted - stop processing for now
				// and these revisions will be processed next time the revision
				// collector runs.
				logger.info('collectRevisions: One or more revision was encrypted. Processing was stopped but will resume later when the revision is decrypted.', error);
			} else {
				// This should not happen anymore because we handle the error in
				// the loop above.
				logger.error('collectRevisions:', error);
			}
		}

		await Setting.saveAll();
		await ItemChangeUtils.deleteProcessedChanges();

		this.isCollecting_ = false;

		logger.info(`collectRevisions: Created revisions for ${doneNoteIds.length} notes`);
	}

	public async deleteOldRevisions(ttl: number) {
		return Revision.deleteOldRevisions(ttl);
	}

	public async revisionNote(revisions: RevisionEntity[], index: number) {
		if (index < 0 || index >= revisions.length) throw new Error(`Invalid revision index: ${index}`);

		const rev = revisions[index];
		const merged = await Revision.mergeDiffs(rev, revisions);

		const output: NoteEntity = {
			title: merged.title,
			body: merged.body,
			...merged.metadata,
		};
		output.updated_time = output.user_updated_time;
		output.created_time = output.user_created_time;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		(output as any).type_ = BaseModel.TYPE_NOTE;
		if (!('markup_language' in output)) output.markup_language = MarkupLanguage.Markdown;

		return output;
	}

	public restoreFolderTitle() {
		return _('Restored Notes');
	}

	public async restoreFolder() {
		let folder = await Folder.loadByTitle(this.restoreFolderTitle());
		if (!folder) {
			folder = await Folder.save({ title: this.restoreFolderTitle() });
		}
		return folder;
	}

	// reverseRevIndex = 0 means restoring the latest version. reverseRevIndex =
	// 1 means the version before that, etc.
	public async restoreNoteById(noteId: string, reverseRevIndex: number): Promise<NoteEntity> {
		const revisions = await Revision.allByType(BaseModel.TYPE_NOTE, noteId);
		if (!revisions.length) throw new Error(`No revision for note "${noteId}"`);

		const revIndex = revisions.length - 1 - reverseRevIndex;

		const note = await this.revisionNote(revisions, revIndex);
		return this.importRevisionNote(note);
	}

	public restoreSuccessMessage(note: NoteEntity): string {
		return _('The note "%s" has been successfully restored to the notebook "%s".', substrWithEllipsis(note.title, 0, 32), this.restoreFolderTitle());
	}

	public async importRevisionNote(note: NoteEntity): Promise<NoteEntity> {
		const toImport = { ...note };
		delete toImport.id;
		delete toImport.updated_time;
		delete toImport.created_time;
		delete toImport.encryption_applied;
		delete toImport.encryption_cipher_text;

		const folder = await this.restoreFolder();

		toImport.parent_id = folder.id;

		return Note.save(toImport);
	}

	public async maintenance() {
		this.maintenanceCalls_.push(true);
		try {
			const startTime = Date.now();
			logger.info('maintenance: Starting...');

			if (!Setting.value('revisionService.enabled')) {
				logger.info('maintenance: Service is disabled');
				// We do as if we had processed all the latest changes so that they can be cleaned up
				// later on by ItemChangeUtils.deleteProcessedChanges().
				Setting.setValue('revisionService.lastProcessedChangeId', await ItemChange.lastChangeId());
				await this.deleteOldRevisions(Setting.value('revisionService.ttlDays') * 24 * 60 * 60 * 1000);
			} else {
				logger.info('maintenance: Service is enabled');
				await this.collectRevisions();
				await this.deleteOldRevisions(Setting.value('revisionService.ttlDays') * 24 * 60 * 60 * 1000);

				logger.info(`maintenance: Done in ${Date.now() - startTime}ms`);
			}
		} catch (error) {
			logger.error('maintenance:', error);
		} finally {
			this.maintenanceCalls_.pop();
		}
	}

	public runInBackground(collectRevisionInterval: number = null) {
		if (this.isRunningInBackground_) return;
		this.isRunningInBackground_ = true;

		if (collectRevisionInterval === null) collectRevisionInterval = 1000 * 60 * 10;

		logger.info(`runInBackground: Starting background service with revision collection interval ${collectRevisionInterval}`);

		this.maintenanceTimer1_ = shim.setTimeout(() => {
			void this.maintenance();
		}, 1000 * 4);

		this.maintenanceTimer2_ = shim.setInterval(() => {
			void this.maintenance();
		}, collectRevisionInterval);
	}

	public async cancelTimers() {
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
