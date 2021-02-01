import BaseModel from '../BaseModel';
import { SqlQuery } from '../database';

// - If is_associated = 1, note_resources indicates which note_id is currently associated with the given resource_id
// - If is_associated = 0, note_resources indicates which note_id *was* associated with the given resource_id
// - last_seen_time tells the last time that reosurce was associated with this note.
// - If last_seen_time is 0, it means the resource has never been associated with any note.

export default class NoteResource extends BaseModel {
	static tableName() {
		return 'note_resources';
	}

	static modelType() {
		return BaseModel.TYPE_NOTE_RESOURCE;
	}

	public static async applySharedStatusToLinkedResources() {
		const queries: SqlQuery[] = [];

		queries.push({ sql: `
			UPDATE resources
			SET is_shared = 0
		` });

		queries.push({ sql: `
			UPDATE resources
			SET is_shared = 1
			WHERE id IN (
				SELECT DISTINCT note_resources.resource_id
				FROM notes JOIN note_resources ON notes.id = note_resources.note_id
				WHERE notes.is_shared = 1
			)
		` });

		await this.db().transactionExecBatch(queries);
	}

	static async associatedNoteIds(resourceId: string): Promise<string[]> {
		const rows = await this.modelSelectAll('SELECT note_id FROM note_resources WHERE resource_id = ? AND is_associated = 1', [resourceId]);
		return rows.map((r: any) => r.note_id);
	}

	static async setAssociatedResources(noteId: string, resourceIds: string[]) {
		const existingRows = await this.modelSelectAll('SELECT * FROM note_resources WHERE note_id = ?', [noteId]);

		const notProcessedResourceIds = resourceIds.slice();
		const queries = [];
		for (let i = 0; i < existingRows.length; i++) {
			const row = existingRows[i];
			const resourceIndex = resourceIds.indexOf(row.resource_id);

			if (resourceIndex >= 0) {
				queries.push({ sql: 'UPDATE note_resources SET last_seen_time = ?, is_associated = 1 WHERE id = ?', params: [Date.now(), row.id] });
				notProcessedResourceIds.splice(notProcessedResourceIds.indexOf(row.resource_id), 1);
			} else {
				queries.push({ sql: 'UPDATE note_resources SET is_associated = 0 WHERE id = ?', params: [row.id] });
			}
		}

		for (let i = 0; i < notProcessedResourceIds.length; i++) {
			queries.push({ sql: 'INSERT INTO note_resources (note_id, resource_id, is_associated, last_seen_time) VALUES (?, ?, ?, ?)', params: [noteId, notProcessedResourceIds[i], 1, Date.now()] });
		}

		await this.db().transactionExecBatch(queries);
	}

	static async addOrphanedResources() {
		const missingResources = await this.db().selectAll('SELECT id FROM resources WHERE id NOT IN (SELECT DISTINCT resource_id FROM note_resources)');
		const queries = [];
		for (let i = 0; i < missingResources.length; i++) {
			const id = missingResources[i].id;
			queries.push({ sql: 'INSERT INTO note_resources (note_id, resource_id, is_associated, last_seen_time) VALUES (?, ?, ?, ?)', params: ['', id, 0, 0] });
		}
		await this.db().transactionExecBatch(queries);
	}

	static async remove(noteId: string) {
		await this.db().exec({ sql: 'UPDATE note_resources SET is_associated = 0 WHERE note_id = ?', params: [noteId] });
	}

	static async orphanResources(expiryDelay: number = null) {
		if (expiryDelay === null) expiryDelay = 1000 * 60 * 60 * 24 * 10;
		const cutOffTime = Date.now() - expiryDelay;
		const output = await this.modelSelectAll(
			`
			SELECT resource_id, sum(is_associated)
			FROM note_resources
			GROUP BY resource_id
			HAVING sum(is_associated) <= 0
			AND last_seen_time < ?
			AND last_seen_time != 0
		`,
			[cutOffTime]
		);
		return output.map((r: any) => r.resource_id);
	}

	static async deleteByResource(resourceId: string) {
		await this.db().exec('DELETE FROM note_resources WHERE resource_id = ?', [resourceId]);
	}
}
