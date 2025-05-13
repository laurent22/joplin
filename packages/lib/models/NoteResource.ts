import BaseModel from '../BaseModel';
import { NoteEntity, SqlQuery } from '../services/database/types';
import BaseItem from './BaseItem';
import { LoadOptions } from './utils/types';

// - If is_associated = 1, note_resources indicates which note_id is currently associated with the given resource_id
// - If is_associated = 0, note_resources indicates which note_id *was* associated with the given resource_id
// - last_seen_time tells the last time that resource was associated with this note.
// - If last_seen_time is 0, it means the resource has never been associated with any note.

export default class NoteResource extends BaseModel {
	public static tableName() {
		return 'note_resources';
	}

	public static modelType() {
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

	// public static async updateResourceShareIds() {
	// 	// Find all resources where share_id is different from parent note
	// 	// share_id. Then update share_id on all these resources. Essentially it
	// 	// makes it match the resource share_id to the note share_id.

	// 	const sql = `
	// 		SELECT r.id, n.share_id
	// 		FROM note_resources nr
	// 		LEFT JOIN resources r ON nr.resource_id = r.id
	// 		LEFT JOIN notes n ON nr.note_id = n.id
	// 		WHERE n.share_id != r.share_id`;

	// 	const rows = await this.db().selectAll(sql);

	// 	const updatedTime = Date.now();
	// 	const queries: SqlQuery[] = [];

	// 	for (const row of rows) {
	// 		queries.push({
	// 			sql: `
	// 				UPDATE resources
	// 				SET share_id = ?, updated_time = ?
	// 				WHERE id = ?`,
	// 			params: [
	// 				row.share_id || '',
	// 				updatedTime,
	// 				row.id,
	// 			],
	// 		});
	// 	}

	// 	await this.db().transactionExecBatch(queries);
	// }

	public static async associatedNoteIds(resourceId: string): Promise<string[]> {
		const rows = await this.modelSelectAll('SELECT note_id FROM note_resources WHERE resource_id = ? AND is_associated = 1', [resourceId]);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		return rows.map((r: any) => r.note_id);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static async associatedResourceNotes(resourceIds: string[], options: LoadOptions = null): Promise<Record<string, any>> {
		if (!resourceIds.length) return {};

		const fields: string[] = options && options.fields ? (options.fields as string[]).slice() : [];
		fields.push('resource_id');
		fields.push('note_id');

		const rows = await this.modelSelectAll(`
			SELECT ${this.selectFields({ ...options, fields })}
			FROM note_resources
			LEFT JOIN notes
			ON notes.id = note_resources.note_id
			WHERE resource_id IN (${this.escapeIdsForSql(resourceIds)}) AND is_associated = 1
		`);

		const output: Record<string, NoteEntity[]> = {};
		for (const row of rows) {
			if (!output[row.resource_id]) output[row.resource_id] = [];
			output[row.resource_id].push(row);
		}

		return output;
	}

	public static async setAssociatedResources(noteId: string, resourceIds: string[]) {
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

	public static async addOrphanedResources() {
		const missingResources = await this.db().selectAll('SELECT id FROM resources WHERE id NOT IN (SELECT DISTINCT resource_id FROM note_resources)');
		const queries = [];
		for (let i = 0; i < missingResources.length; i++) {
			const id = missingResources[i].id;

			// If the resource is not associated with any note, and has never
			// been synced, it means it's a local resource that was removed from
			// a note (or the note was deleted). In which case, we set a
			// "last_seen_time", so that it can be considered an orphan resource
			// that can be auto-deleted.
			//
			// https://github.com/laurent22/joplin/issues/932#issuecomment-933736405

			const hasBeenSynced = await BaseItem.itemHasBeenSynced(id);
			const lastSeenTime = hasBeenSynced ? 0 : Date.now();

			queries.push({
				sql: 'INSERT INTO note_resources (note_id, resource_id, is_associated, last_seen_time) VALUES (?, ?, ?, ?)',
				params: ['', id, 0, lastSeenTime] },
			);
		}
		await this.db().transactionExecBatch(queries);
	}

	public static async remove(noteId: string) {
		await this.db().exec({ sql: 'UPDATE note_resources SET is_associated = 0 WHERE note_id = ?', params: [noteId] });
	}

	public static async orphanResources(expiryDelay: number = null) {
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
			[cutOffTime],
		);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		return output.map((r: any) => r.resource_id);
	}

	public static async deleteByResource(resourceId: string) {
		await this.db().exec('DELETE FROM note_resources WHERE resource_id = ?', [resourceId]);
	}
}
