const ItemChange = require('lib/models/ItemChange');
const NoteResource = require('lib/models/NoteResource');
const Note = require('lib/models/Note');
const BaseModel = require('lib/BaseModel');

class ResourceService {

	async indexNoteResources() {
		let lastId = 0;
		let lastCreatedTime = 0

		while (true) {
			const changes = await ItemChange.modelSelectAll(`
				SELECT id, item_id, type, created_time
				FROM item_changes
				WHERE item_type = ?
				AND id > ?
				AND created_time >= ?
				ORDER BY id, created_time ASC
				LIMIT 10
			`, [BaseModel.TYPE_NOTE, lastId, lastCreatedTime]);

			if (!changes.length) break;

			const noteIds = changes.map(a => a.item_id);
			const changesByNoteId = {};
			for (let i = 0; i < changes.length; i++) {
				changesByNoteId[changes[i].item_id] = changes[i];
			}

			const notes = await Note.modelSelectAll('SELECT id, title, body FROM notes WHERE id IN ("' + noteIds.join('","') + '")');

			for (let i = 0; i < notes.length; i++) {
				const note = notes[i];
				const change = changesByNoteId[note.id];

				if (change.type === ItemChange.TYPE_CREATE || change.type === ItemChange.TYPE_UPDATE) {
					const resourceIds = Note.linkedResourceIds(note.body);
					await NoteResource.associate(note.id, resourceIds);
				} else if (change.type === ItemChange.TYPE_DELETE) {
					await NoteResource.remove(note.id);
				} else {
					throw new Error('Invalid change type: ' + change.type);
				}

				lastId = change.id;
				lastCreatedTime = change.created_time;
			}
		}
	}

}

module.exports = ResourceService;