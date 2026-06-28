import BaseModel from '../BaseModel';
import JoplinDatabase from '../JoplinDatabase';
import { NoteEmbeddingsMetaEntity } from '../services/database/types';

// Storage for per-note chunk embeddings.
//
// Metadata lives in `note_embeddings_meta` (regular SQLite table, migration
// 52). Vectors live in `note_embeddings_vec`, a sqlite-vec `vec0` virtual
// table created lazily when sqlite-vec is available. Joined by rowid.
// Vector methods throw if sqlite-vec is missing; metadata methods work
// regardless.

interface SaveChunk {
	chunkIndex: number;
	chunkText: string;
	vector: number[];
}

interface SimilarityResult {
	noteId: string;
	chunkIndex: number;
	chunkText: string;
	distance: number;
}

interface SimilaritySearchOptions {
	k: number;
	// Raw L2 distance from vec0 (caller converts to cosine if needed).
	maxDistance?: number;
	// Pre-resolved scope filter. Empty array = search nothing.
	noteIds?: string[];
}

export default class NoteEmbedding extends BaseModel {

	public static tableName() {
		return 'note_embeddings_meta';
	}

	public static modelType() {
		return BaseModel.TYPE_NOTE_EMBEDDING;
	}

	private static joplinDb(): JoplinDatabase {
		return this.db() as JoplinDatabase;
	}

	// Single source of truth for "can we use vector search?". Callers that
	// would otherwise throw (the indexer, search APIs) should gate on this and
	// no-op when it's false, so users on platforms without sqlite-vec don't
	// get a flood of failed-to-index errors.
	public static vectorSearchAvailable(): boolean {
		return this.joplinDb().sqliteVecAvailable();
	}

	private static requireVec() {
		if (!this.vectorSearchAvailable()) {
			throw new Error('Vector search is unavailable: sqlite-vec extension is not loaded on this platform');
		}
	}

	// Called lazily — CREATE VIRTUAL TABLE fails without sqlite-vec loaded.
	public static async ensureVecTable(dimension: number) {
		this.requireVec();
		await this.db().exec(
			`CREATE VIRTUAL TABLE IF NOT EXISTS note_embeddings_vec USING vec0(embedding FLOAT[${dimension}])`,
		);
	}

	public static async byNoteId(noteId: string): Promise<NoteEmbeddingsMetaEntity[]> {
		return this.db().selectAll<NoteEmbeddingsMetaEntity>(
			'SELECT * FROM note_embeddings_meta WHERE note_id = ? ORDER BY chunk_index ASC',
			[noteId],
		);
	}

	public static async countByNoteId(noteId: string): Promise<number> {
		const row = await this.db().selectOne(
			'SELECT COUNT(*) AS c FROM note_embeddings_meta WHERE note_id = ?',
			[noteId],
		) as { c: number } | null;
		return row?.c ?? 0;
	}

	public static async distinctNoteIdCount(): Promise<number> {
		const row = await this.db().selectOne(
			'SELECT COUNT(DISTINCT note_id) AS c FROM note_embeddings_meta',
		) as { c: number } | null;
		return row?.c ?? 0;
	}

	// Indexable notes not yet embedded — drives the indexer's initial scan.
	// `excludeIds` lets the caller skip notes that already failed this session,
	// so a permanently bad note doesn't keep coming back.
	public static async notYetIndexedNoteIds(limit: number, excludeIds: string[] = []): Promise<string[]> {
		const excludeSql = excludeIds.length
			? ` AND n.id NOT IN (${excludeIds.map(() => '?').join(',')})`
			: '';
		const rows = await this.db().selectAll<{ id: string }>(
			`SELECT n.id FROM notes n
			 WHERE (n.deleted_time IS NULL OR n.deleted_time = 0)
			   AND (n.is_conflict IS NULL OR n.is_conflict = 0)
			   AND n.is_locked = 0
			   AND NOT EXISTS (SELECT 1 FROM note_embeddings_meta m WHERE m.note_id = n.id)${excludeSql}
			 LIMIT ?`,
			[...excludeIds, limit],
		);
		return rows.map(r => r.id);
	}

	// Vec-table delete is guarded by sqliteVecAvailable() AND vecTableExists()
	// because saveChunks creates the vec table lazily.
	public static async deleteByNoteId(noteId: string) {
		const rows = await this.db().selectAll<{ id: number }>(
			'SELECT id FROM note_embeddings_meta WHERE note_id = ?',
			[noteId],
		);
		if (!rows.length) return;
		const ids = rows.map(r => r.id);
		const placeholders = ids.map(() => '?').join(',');
		const queries: { sql: string; params: (string|number)[] }[] = [
			{ sql: `DELETE FROM note_embeddings_meta WHERE id IN (${placeholders})`, params: ids },
		];
		if (this.joplinDb().sqliteVecAvailable() && await this.vecTableExists()) {
			queries.push({ sql: `DELETE FROM note_embeddings_vec WHERE rowid IN (${placeholders})`, params: ids });
		}
		await this.db().transactionExecBatch(queries);
	}

	private static async vecTableExists(): Promise<boolean> {
		const row = await this.db().selectOne(
			'SELECT name FROM sqlite_master WHERE type=\'table\' AND name=\'note_embeddings_vec\'',
		) as { name: string } | null;
		return !!row;
	}

	// Replaces every chunk for a note. modelId is stored per row so a future
	// model change can trigger a re-index. Not wrapped in a transaction: a
	// mid-save crash leaves a partial set, but the indexer reprocesses via
	// the ItemChange cursor and saveChunks begins by clearing the note.
	public static async saveChunks(noteId: string, modelId: string, chunks: SaveChunk[]) {
		this.requireVec();
		if (chunks.length === 0) {
			await this.deleteByNoteId(noteId);
			return;
		}

		const dimension = chunks[0].vector.length;
		for (const chunk of chunks) {
			if (chunk.vector.length !== dimension) {
				throw new Error(`All vectors for a note must have the same dimension. Got ${chunk.vector.length}, expected ${dimension}`);
			}
		}

		await this.ensureVecTable(dimension);
		await this.deleteByNoteId(noteId);

		const now = Date.now();
		for (const chunk of chunks) {
			// node-sqlite3's exec() doesn't return the insert id, so read it
			// back with last_insert_rowid(). The driver serialises queries on
			// the same connection so there's no race.
			await this.db().exec({
				sql: 'INSERT INTO note_embeddings_meta(note_id, chunk_index, model_id, chunk_text, created_time) VALUES (?, ?, ?, ?, ?)',
				params: [noteId, chunk.chunkIndex, modelId, chunk.chunkText, now],
			});
			const row = await this.db().selectOne('SELECT last_insert_rowid() AS id') as { id: number } | null;
			const lastID = row?.id;
			if (!lastID) throw new Error('Failed to obtain rowid after embedding insert');

			// Wipe any orphan vec-row at this rowid before inserting. Orphans
			// show up when a prior saveChunks crashed between the meta insert
			// and the vec insert: meta was wiped on the next pass but the vec
			// row stayed, and sqlite later hands us the same rowid (#15761).
			// vec0 doesn't support INSERT OR REPLACE — explicit DELETE then INSERT.
			await this.db().exec({
				sql: 'DELETE FROM note_embeddings_vec WHERE rowid = ?',
				params: [lastID],
			});
			await this.db().exec({
				sql: 'INSERT INTO note_embeddings_vec(rowid, embedding) VALUES (?, ?)',
				params: [lastID, JSON.stringify(chunk.vector)],
			});
		}
	}

	public static async similaritySearch(
		queryVector: number[],
		options: SimilaritySearchOptions,
	): Promise<SimilarityResult[]> {
		this.requireVec();
		if (!await this.vecTableExists()) return [];

		// Explicit empty noteIds = search nothing (vs undefined = search all).
		if (options.noteIds && options.noteIds.length === 0) return [];

		const k = Math.max(1, options.k | 0);

		// vec0 needs k inlined into the MATCH clause; a parameter-bound LIMIT
		// after a JOIN isn't visible to its planner. With a noteIds filter we
		// over-fetch 4× and trim after, so the post-join filter has room to
		// drop non-matches. Pathological vaults can still under-fill.
		const fetchSize = options.noteIds?.length ? k * 4 : k;

		const whereParts: string[] = [`v.embedding MATCH ? AND k = ${fetchSize}`];
		const params: (string|number)[] = [JSON.stringify(queryVector)];

		if (options.noteIds && options.noteIds.length) {
			whereParts.push(`m.note_id IN (${options.noteIds.map(() => '?').join(',')})`);
			params.push(...options.noteIds);
		}

		const sql = `
			SELECT m.note_id, m.chunk_index, m.chunk_text, v.distance
			FROM note_embeddings_vec v
			JOIN note_embeddings_meta m ON m.id = v.rowid
			WHERE ${whereParts.join(' AND ')}
			ORDER BY v.distance
			LIMIT ${k}
		`;

		const rows = await this.db().selectAll<{
			note_id: string;
			chunk_index: number;
			chunk_text: string;
			distance: number;
		}>(sql, params);

		const results = rows.map(r => ({
			noteId: r.note_id,
			chunkIndex: r.chunk_index,
			chunkText: r.chunk_text,
			distance: r.distance,
		}));

		if (options.maxDistance !== undefined) {
			return results.filter(r => r.distance <= options.maxDistance);
		}
		return results;
	}

	// Loads the stored vectors for a note's chunks in chunk-index order.
	// Lets noteId-based searches reuse indexed vectors instead of re-embedding.
	public static async vectorsByNoteId(noteId: string): Promise<number[][]> {
		this.requireVec();
		if (!await this.vecTableExists()) return [];
		const rows = await this.db().selectAll<{ embedding: string }>(
			`SELECT vec_to_json(v.embedding) AS embedding
			 FROM note_embeddings_vec v
			 JOIN note_embeddings_meta m ON m.id = v.rowid
			 WHERE m.note_id = ?
			 ORDER BY m.chunk_index ASC`,
			[noteId],
		);
		return rows.map(r => JSON.parse(r.embedding) as number[]);
	}

	// Drops every embedding. Used when the active model's id changes.
	public static async clearAll() {
		const queries: string[] = ['DELETE FROM note_embeddings_meta'];
		if (this.joplinDb().sqliteVecAvailable() && await this.vecTableExists()) {
			queries.push('DELETE FROM note_embeddings_vec');
		}
		await this.db().transactionExecBatch(queries);
	}
}
