const ItemChange = require('lib/models/ItemChange');
const NoteResource = require('lib/models/NoteResource');
const Note = require('lib/models/Note');
const Resource = require('lib/models/Resource');
const BaseModel = require('lib/BaseModel');
const BaseService = require('lib/services/BaseService');
const { shim } = require('lib/shim');

class ResourceService extends BaseService {

	async indexNoteResources() {
		this.logger().info('ResourceService::indexNoteResources: Start');

		let lastId = 0;

		const processedChangeIds = [];

		await ItemChange.waitForAllSaved();

		while (true) {
			const changes = await ItemChange.modelSelectAll(`
				SELECT id, item_id, type
				FROM item_changes
				WHERE item_type = ?
				AND id > ?
				ORDER BY id ASC
				LIMIT 100
			`, [BaseModel.TYPE_NOTE, lastId]);

			if (!changes.length) break;

			const noteIds = changes.map(a => a.item_id);
			const notes = await Note.modelSelectAll('SELECT id, title, body FROM notes WHERE id IN ("' + noteIds.join('","') + '")');

			const noteById = (noteId) => {
				for (let i = 0; i < notes.length; i++) {
					if (notes[i].id === noteId) return notes[i];
				}
				throw new Error('Invalid note ID: ' + noteId);
			}

			for (let i = 0; i < changes.length; i++) {
				const change = changes[i];

				if (change.type === ItemChange.TYPE_CREATE || change.type === ItemChange.TYPE_UPDATE) {
					const note = noteById(change.item_id);
					const resourceIds = Note.linkedResourceIds(note.body);
					await NoteResource.setAssociatedResources(note.id, resourceIds);
				} else if (change.type === ItemChange.TYPE_DELETE) {
					await NoteResource.remove(change.item_id);
				} else {
					throw new Error('Invalid change type: ' + change.type);
				}

				lastId = change.id;

				processedChangeIds.push(change.id);
			}
		}

		if (lastId) {
			await ItemChange.db().exec('DELETE FROM item_changes WHERE id <= ?', [lastId]);
		}

		await NoteResource.addOrphanedResources();

		this.logger().info('ResourceService::indexNoteResources: Completed');
	}

	async deleteOrphanResources(expiryDelay = null) {
		const resourceIds = await NoteResource.orphanResources(expiryDelay);
		this.logger().info('ResourceService::deleteOrphanResources:', resourceIds);
		for (let i = 0; i < resourceIds.length; i++) {
			await Resource.delete(resourceIds[i]);
		}
	}

	async maintenance() {
		await this.indexNoteResources();
		await this.deleteOrphanResources();
	}

	static runInBackground() {
		if (this.isRunningInBackground_) return;

		this.isRunningInBackground_ = true;
		const service = new ResourceService();

		setTimeout(() => {
			service.maintenance();
		}, 1000 * 30);
		
		shim.setInterval(() => {
			service.maintenance();
		}, 1000 * 60 * 60 * 4);
	}

}

module.exports = ResourceService;