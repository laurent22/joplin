import BaseModel from '../BaseModel';
import JoplinDatabase from '../JoplinDatabase';
import { NoteEmbeddingsMetaEntity } from '../services/database/types';

// Storage for per-note chunk embeddings produced by the AI embeddings index.
//
// Metadata (chunk text, source note ID, model identifier) lives in the regular
// `note_embeddings_meta` table created by migration 52.
//
// The associated vectors are stored in a sqlite-vec `vec0` virtual table
// (`note_embeddings_vec`) created lazily by `ensureVecTable()` when sqlite-vec
// is available. Joining is done by rowid — the meta row's id is the same as
// the vec row's rowid.
//
// All vector-touching methods check `JoplinDatabase.sqliteVecAvailable()` and
// throw a clear error if vector search isn't supported on this platform. The
// metadata-only methods work regardless.

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
	// Maximum cosine distance to include. sqlite-vec returns L2 distance for
	// vec0 by default; for normalised vectors L2² ≈ 2·(1 − cosine). The caller
	// converts as needed; this layer just exposes the distance as returned by
	// the extension.
	maxDistance?: number;
	// Restrict results to this set of note IDs. Used for scoped searches
	// (notebook, tag, note) — the caller resolves scope → note IDs first.
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

	private static requireVec() {
		if (!this.joplinDb().sqliteVecAvailable()) {
			throw new Error('Vector search is unavailable: sqlite-vec extension is not loaded on this platform');
		}
	}

	// Creates the sqlite-vec virtual table if it doesn't already exist. Called
	// lazily because the CREATE VIRTUAL TABLE statement fails on platforms
	// without the extension.
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

	// Picks indexable notes (not trashed, not in conflict) that haven't been
	// embedded yet. Used by the indexer's backfill path so existing notes
	// from before AI was enabled get picked up over successive ticks.
	public static async notYetIndexedNoteIds(limit: number): Promise<string[]> {
		const rows = await this.db().selectAll<{ id: string }>(
			`SELECT id FROM notes
			 WHERE (deleted_time IS NULL OR deleted_time = 0)
			   AND (is_conflict IS NULL OR is_conflict = 0)
			   AND id NOT IN (SELECT DISTINCT note_id FROM note_embeddings_meta)
			 LIMIT ?`,
			[limit],
		);
		return rows.map(r => r.id);
	}

	// Removes every chunk for a note from both the meta table and the vec
	// table. Used before re-indexing a changed note and during note deletion.
	//
	// The vec-table delete is guarded by both `sqliteVecAvailable()` AND the
	// table's existence — saveChunks creates the vec table lazily, so on a
	// fresh profile it may not exist yet.
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

	// Replaces every chunk for a note with a new set. The `modelId` is recorded
	// alongside each chunk so a future model change can trigger a re-index.
	//
	// Not transactional: if the process crashes mid-save the indexer will
	// later see the half-written set, treat the note as out-of-date via the
	// ItemChange cursor, and re-run saveChunks (which begins with a
	// deleteByNoteId so the partial set is cleared). A future PR can add a
	// proper transactional helper to `Database` once there are other callers
	// that need it.
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
			// Insert into meta, then read back the auto-assigned id via
			// last_insert_rowid() — node-sqlite3's exec() doesn't return it
			// directly. The driver serialises queries through a mutex so the
			// reading query runs on the same connection without races.
			await this.db().exec({
				sql: 'INSERT INTO note_embeddings_meta(note_id, chunk_index, model_id, chunk_text, created_time) VALUES (?, ?, ?, ?, ?)',
				params: [noteId, chunk.chunkIndex, modelId, chunk.chunkText, now],
			});
			const row = await this.db().selectOne('SELECT last_insert_rowid() AS id') as { id: number } | null;
			const lastID = row?.id;
			if (!lastID) throw new Error('Failed to obtain rowid after embedding insert');

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
		// On a fresh profile the vec table is created lazily by saveChunks(),
		// so it may not exist yet. Treat that as "no embeddings to match"
		// rather than letting the query throw "no such table".
		if (!await this.vecTableExists()) return [];

		// An explicitly-empty noteIds means "search within zero notes" — return
		// nothing rather than silently widening the search to all notes.
		if (options.noteIds && options.noteIds.length === 0) return [];

		const k = Math.max(1, options.k | 0);

		// sqlite-vec's vec0 needs an inline `k = ?` constraint or a hardcoded
		// LIMIT — a parameter-bound LIMIT after a JOIN isn't visible to its
		// optimiser. When a noteIds filter is in play we over-fetch by 4× so
		// the post-join filter rarely starves the result set, then trim to k.
		// This is a heuristic — pathological cases (large global indexes where
		// most top matches fall outside the scope) can still under-fill. A
		// follow-up can switch to pre-resolving noteIds → rowids and pushing
		// the filter into the vec MATCH clause directly.
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

	// Loads the stored vectors for a note's chunks, in chunk-index order.
	// Used by the search service for noteId-based queries — re-using the
	// already-indexed vectors avoids both re-embedding and the asymmetry
	// you'd otherwise get from running them through embedQuery().
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

	// Drops every embedding from both tables. Used when the embedding model
	// changes — the existing vectors are no longer comparable to anything new.
	public static async clearAll() {
		const queries: string[] = ['DELETE FROM note_embeddings_meta'];
		// Vec-table delete is guarded the same way as deleteByNoteId — the
		// table is created lazily, so on a fresh profile it may not exist yet.
		if (this.joplinDb().sqliteVecAvailable() && await this.vecTableExists()) {
			queries.push('DELETE FROM note_embeddings_vec');
		}
		await this.db().transactionExecBatch(queries);
	}
}
