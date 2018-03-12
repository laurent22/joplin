const BaseModel = require('lib/BaseModel.js');

class NoteResource extends BaseModel {

	static tableName() {
		return 'note_resources';
	}

	static modelType() {
		return BaseModel.TYPE_NOTE_RESOURCE;
	}

	static async associate(noteId, resourceIds) {
		let queries = [];
		queries.push({ sql: 'DELETE FROM note_resources WHERE note_id = ?', params: [noteId] });

		for (let i = 0; i < resourceIds.length; i++) {
			queries.push({ sql: 'INSERT INTO note_resources (note_id, resource_id) VALUES (?, ?)', params: [noteId, resourceIds[i]] });
		}

		await this.db().transactionExecBatch(queries);
	}

	static async remove(noteId) {
		let queries = [];
		queries.push({ sql: 'DELETE FROM note_resources WHERE note_id = ?', params: [noteId] });
		await this.db().transactionExecBatch(queries);
	}

}

module.exports = NoteResource;