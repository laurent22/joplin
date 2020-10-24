const ItemChange = require('lib/models/ItemChange');
const NoteResource = require('lib/models/NoteResource');
const Note = require('lib/models/Note');
const Resource = require('lib/models/Resource');
const BaseModel = require('lib/BaseModel');
const BaseService = require('lib/services/BaseService');
const SearchEngine = require('lib/services/searchengine/SearchEngine');
const Setting = require('lib/models/Setting');
const { shim } = require('lib/shim');
const ItemChangeUtils = require('lib/services/ItemChangeUtils');
const { sprintf } = require('sprintf-js');

class ResourceService extends BaseService {
	constructor() {
		super();

		this.maintenanceCalls_ = [];
		this.maintenanceTimer1_ = null;
		this.maintenanceTimer2_ = null;
	}

	static instance() {
		if (this.instance_) return this.instance_;
		this.instance_ = new ResourceService();
		return this.instance_;
	}

	async indexNoteResources() {
		this.logger().info('ResourceService::indexNoteResources: Start');

		await ItemChange.waitForAllSaved();

		let foundNoteWithEncryption = false;

		while (true) {
			const changes = await ItemChange.modelSelectAll(`
				SELECT id, item_id, type
				FROM item_changes
				WHERE item_type = ?
				AND id > ?
				ORDER BY id ASC
				LIMIT 10
			`,
			[BaseModel.TYPE_NOTE, Setting.value('resourceService.lastProcessedChangeId')]
			);

			if (!changes.length) break;

			const noteIds = changes.map(a => a.item_id);
			const notes = await Note.modelSelectAll(`SELECT id, title, body, encryption_applied FROM notes WHERE id IN ("${noteIds.join('","')}")`);

			const noteById = noteId => {
				for (let i = 0; i < notes.length; i++) {
					if (notes[i].id === noteId) return notes[i];
				}
				// The note may have been deleted since the change was recorded. For example in this case:
				// - Note created (Some Change object is recorded)
				// - Note is deleted
				// - ResourceService indexer runs.
				// In that case, there will be a change for the note, but the note will be gone.
				return null;
			};

			for (let i = 0; i < changes.length; i++) {
				const change = changes[i];

				if (change.type === ItemChange.TYPE_CREATE || change.type === ItemChange.TYPE_UPDATE) {
					const note = noteById(change.item_id);

					if (note) {
						if (note.encryption_applied) {
							// If we hit an encrypted note, abort processing for now.
							// Note will eventually get decrypted and processing can resume then.
							// This is a limitation of the change tracking system - we cannot skip a change
							// and keep processing the rest since we only keep track of "lastProcessedChangeId".
							foundNoteWithEncryption = true;
							break;
						}

						await this.setAssociatedResources_(note);
					} else {
						this.logger().warn(`ResourceService::indexNoteResources: A change was recorded for a note that has been deleted: ${change.item_id}`);
					}
				} else if (change.type === ItemChange.TYPE_DELETE) {
					await NoteResource.remove(change.item_id);
				} else {
					throw new Error(`Invalid change type: ${change.type}`);
				}

				Setting.setValue('resourceService.lastProcessedChangeId', change.id);
			}

			if (foundNoteWithEncryption) break;
		}

		await Setting.saveAll();

		await NoteResource.addOrphanedResources();

		await ItemChangeUtils.deleteProcessedChanges();

		this.logger().info('ResourceService::indexNoteResources: Completed');
	}

	async setAssociatedResources_(note) {
		const resourceIds = await Note.linkedResourceIds(note.body);
		await NoteResource.setAssociatedResources(note.id, resourceIds);
	}

	async deleteOrphanResources(expiryDelay = null) {
		if (expiryDelay === null) expiryDelay = Setting.value('revisionService.ttlDays') * 24 * 60 * 60 * 1000;
		const resourceIds = await NoteResource.orphanResources(expiryDelay);
		this.logger().info('ResourceService::deleteOrphanResources:', resourceIds);
		for (let i = 0; i < resourceIds.length; i++) {
			const resourceId = resourceIds[i];
			const results = await SearchEngine.instance().search(resourceId);
			if (results.length) {
				const note = await Note.load(results[0].id);
				if (note) {
					this.logger().info(sprintf('ResourceService::deleteOrphanResources: Skipping deletion of resource %s because it is still referenced in note %s. Re-indexing note content to fix the issue.', resourceId, note.id));
					await this.setAssociatedResources_(note);
				}
			} else {
				await Resource.delete(resourceId);
			}
		}
	}

	static async autoSetFileSize(resourceId, filePath, waitTillExists = true) {
		const itDoes = await shim.fsDriver().waitTillExists(filePath, waitTillExists ? 10000 : 0);
		if (!itDoes) {
			// this.logger().warn('Trying to set file size on non-existent resource:', resourceId, filePath);
			return;
		}
		const fileStat = await shim.fsDriver().stat(filePath);
		await Resource.setFileSizeOnly(resourceId, fileStat.size);
	}

	static async autoSetFileSizes() {
		const resources = await Resource.needFileSizeSet();

		for (const r of resources) {
			await this.autoSetFileSize(r.id, Resource.fullPath(r), false);
		}
	}

	async maintenance() {
		this.maintenanceCalls_.push(true);
		try {
			await this.indexNoteResources();
			await this.deleteOrphanResources();
		} finally {
			this.maintenanceCalls_.pop();
		}
	}

	static runInBackground() {
		if (this.isRunningInBackground_) return;

		this.isRunningInBackground_ = true;
		const service = this.instance();

		service.maintenanceTimer1_ = setTimeout(() => {
			service.maintenance();
		}, 1000 * 30);

		service.maintenanceTimer2_ = shim.setInterval(() => {
			service.maintenance();
		}, 1000 * 60 * 60 * 4);
	}

	async cancelTimers() {
		if (this.maintenanceTimer1_) {
			clearTimeout(this.maintenanceTimer1);
			this.maintenanceTimer1_ = null;
		}
		if (this.maintenanceTimer2_) {
			shim.clearInterval(this.maintenanceTimer2);
			this.maintenanceTimer2_ = null;
		}

		return new Promise((resolve) => {
			const iid = setInterval(() => {
				if (!this.maintenanceCalls_.length) {
					clearInterval(iid);
					resolve();
				}
			}, 100);
		});
	}
}

module.exports = ResourceService;
