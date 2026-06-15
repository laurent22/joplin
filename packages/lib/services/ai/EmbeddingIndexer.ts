import Setting from '../../models/Setting';
import shim from '../../shim';
import Logger from '@joplin/utils/Logger';
import { Minute } from '@joplin/utils/time';
import { ModelType } from '../../BaseModel';
import ItemChange from '../../models/ItemChange';
import Note from '../../models/Note';
import { NoteEntity, ItemChangeEntity } from '../database/types';
import NoteEmbedding from '../../models/NoteEmbedding';
import AiService from './AiService';
import { chunkText } from './chunker';
import { EmbeddingProvider, IndexStatus } from './types';

const logger = Logger.create('EmbeddingIndexer');

// 5-minute interval matches OcrService — slow enough to avoid burning CPU on
// every edit, fast enough that newly-saved notes are searchable within minutes.
const MAINTENANCE_INTERVAL = 5 * Minute;

// How many item_changes we process per maintenance tick. Keeps the indexer
// responsive on huge backlogs (e.g. first run on an existing vault) by
// committing progress after each batch rather than holding everything in
// memory until done.
const BATCH_SIZE = 100;

// Background service that watches `item_changes` for note edits, chunks the
// note body, asks the active EmbeddingProvider to embed each chunk, and stores
// the result via the NoteEmbedding model.
//
// Lifecycle is identical to OcrService: `runInBackground()` starts a timer,
// `stopRunInBackground()` stops it. Both are idempotent.
//
// Progress is durable via two settings:
// - `ai.embedding.lastProcessedChangeId` is the cursor into item_changes. We
//   resume from this on every restart, so a crashed indexer doesn't reprocess
//   notes it already handled.
// - `ai.embedding.lastIndexedModelId` is the model that produced the current
//   vectors. If the active provider's modelId differs (e.g. the user upgraded
//   the local model, or switched to a cloud embedding provider), we wipe
//   note_embeddings and start over — vectors from different models aren't
//   comparable.

export default class EmbeddingIndexer {

	private static instance_: EmbeddingIndexer;

	public static instance(): EmbeddingIndexer {
		if (!this.instance_) this.instance_ = new EmbeddingIndexer();
		return this.instance_;
	}

	private maintenanceTimer_: ReturnType<typeof shim.setInterval> = null;
	private isRunningInBackground_ = false;
	private maintenanceRunning_ = false;

	public async runInBackground() {
		if (this.isRunningInBackground_) return;
		this.isRunningInBackground_ = true;

		logger.info('Starting background indexer');
		// Kick the first maintenance off without awaiting — model load + first
		// embed batch can take 5-15s and we don't want to block app startup on
		// it. The timer below picks up subsequent runs.
		void this.maintenance();

		this.maintenanceTimer_ = shim.setInterval(async () => {
			await this.maintenance();
		}, MAINTENANCE_INTERVAL);
	}

	public async stopRunInBackground() {
		if (!this.isRunningInBackground_) return;
		logger.info('Stopping background indexer');
		if (this.maintenanceTimer_) shim.clearInterval(this.maintenanceTimer_);
		this.maintenanceTimer_ = null;
		this.isRunningInBackground_ = false;
	}

	// Snapshot of model + indexer state for the settings UI and the
	// joplin.ai.indexStatus() plugin API. Cheap to call (two COUNT(*) and one
	// provider state probe) so callers can poll on a UI tick.
	public async getStatus(): Promise<IndexStatus> {
		const provider = AiService.instance().getActiveEmbeddingProvider();

		let modelDownloadStatus: IndexStatus['modelDownloadStatus'] = 'unavailable';
		if (provider) {
			modelDownloadStatus = provider.modelDownloadStatus
				? await provider.modelDownloadStatus()
				// Remote / test providers without a downloadable artefact are
				// always "ready" — surfacing 'downloaded' lets the UI treat
				// them uniformly without a special "n/a" branch.
				: 'downloaded';
		}

		let indexerState: IndexStatus['indexerState'];
		if (!Setting.value('ai.enabled')) {
			indexerState = 'ai-disabled';
		} else if (!Setting.value('ai.embedding.enabled')) {
			indexerState = 'index-disabled';
		} else if (this.maintenanceRunning_) {
			indexerState = 'running';
		} else {
			indexerState = 'idle';
		}

		// Both counts exclude trashed and conflict notes so the "indexed N/M"
		// ratio is interpretable: M is the universe the indexer cares about,
		// not the entire notes table.
		const notesIndexed = await NoteEmbedding.distinctNoteIdCount();
		const totalNotes = await Note.indexableCount();

		return { modelDownloadStatus, indexerState, notesIndexed, totalNotes };
	}

	// Single maintenance tick. Public so tests can drive the indexer without
	// waiting for a real timer fire.
	public async maintenance() {
		if (this.maintenanceRunning_) {
			// Don't queue concurrent maintenance runs; if the previous one is
			// still going (e.g. a huge initial backlog), the next tick will
			// pick up where it left off.
			logger.info('Skipping maintenance — previous run still in flight');
			return;
		}
		this.maintenanceRunning_ = true;
		try {
			const provider = AiService.instance().getActiveEmbeddingProvider();
			if (!provider) {
				logger.info('No embedding provider configured — skipping');
				return;
			}

			await this.handleModelChange(provider);
			// Drain the change feed first so a recent edit isn't starved by a
			// large backfill. Then top up the same batch slot with any
			// not-yet-indexed notes from before the cursor (existing notes on
			// first enable, or notes that pre-date the embeddings feature).
			const processed = await this.processChangeBatch(provider);
			if (processed < BATCH_SIZE) {
				await this.processBackfillBatch(provider, BATCH_SIZE - processed);
			}
		} catch (error) {
			logger.error('Maintenance run failed:', error);
		} finally {
			this.maintenanceRunning_ = false;
		}
	}

	// If the active provider's modelId doesn't match what's stored for the
	// existing vectors, clear everything and reset the cursor. The next
	// maintenance tick will rebuild from scratch.
	private async handleModelChange(provider: EmbeddingProvider) {
		const lastModelId = Setting.value('ai.embedding.lastIndexedModelId') as string;
		if (lastModelId === provider.modelId) return;

		logger.info(`Embedding model changed (${lastModelId || '<none>'} → ${provider.modelId}). Clearing and re-indexing.`);
		await NoteEmbedding.clearAll();
		Setting.setValue('ai.embedding.lastProcessedChangeId', 0);
		Setting.setValue('ai.embedding.lastIndexedModelId', provider.modelId);
	}

	// Returns the number of notes acted on so the caller can decide how much
	// backfill room is left in this tick.
	private async processChangeBatch(provider: EmbeddingProvider): Promise<number> {
		const cursor = Setting.value('ai.embedding.lastProcessedChangeId') as number;
		const changes = await ItemChange.changesSinceId(cursor, { limit: BATCH_SIZE });
		if (!changes.length) return 0;

		// Collapse duplicates so we only embed each note once per batch even
		// when there are multiple updates queued for it. Process deletes last
		// so a delete-then-create within the batch lands in the right order.
		const latestPerNote = new Map<string, ItemChangeEntity>();
		for (const change of changes) {
			if (change.item_type !== ModelType.Note) continue;
			latestPerNote.set(change.item_id, change);
		}

		for (const [noteId, change] of latestPerNote) {
			try {
				if (change.type === ItemChange.TYPE_DELETE) {
					await NoteEmbedding.deleteByNoteId(noteId);
				} else {
					await this.indexNote(noteId, provider);
				}
			} catch (error) {
				// Don't let one bad note stop the whole batch. The cursor will
				// advance past it; if the user fixes the underlying issue
				// they can trigger a full re-index later.
				logger.warn(`Failed to index note ${noteId}:`, error);
			}
		}

		// Advance the cursor to the highest change ID we just looked at. If
		// the indexer crashes mid-batch the cursor stays at its previous
		// value, so the next run reprocesses the partially-applied notes
		// (idempotently — saveChunks deletes existing chunks first).
		const highestId = changes[changes.length - 1].id;
		Setting.setValue('ai.embedding.lastProcessedChangeId', highestId);

		return latestPerNote.size;
	}

	// Picks up any indexable notes that haven't been embedded yet — typically
	// the existing notes on a fresh AI enable, or notes that pre-date this
	// feature. Bounded by the slot left over from the change-feed batch so
	// each tick stays predictable in cost.
	private async processBackfillBatch(provider: EmbeddingProvider, limit: number): Promise<void> {
		if (limit <= 0) return;

		const noteIds = await NoteEmbedding.notYetIndexedNoteIds(limit);
		if (!noteIds.length) return;

		logger.info(`Backfill: indexing ${noteIds.length} note(s) not yet in the embeddings index`);
		for (const noteId of noteIds) {
			try {
				await this.indexNote(noteId, provider);
			} catch (error) {
				logger.warn(`Backfill failed for note ${noteId}:`, error);
			}
		}
	}

	private async indexNote(noteId: string, provider: EmbeddingProvider) {
		const note = await Note.load(noteId) as NoteEntity | null;
		if (!note) {
			// Note may have been deleted between the change being recorded
			// and us getting around to it.
			await NoteEmbedding.deleteByNoteId(noteId);
			return;
		}

		// Skip notes that retrieval should never return — keeps the index
		// smaller and avoids surprising search results.
		if (note.is_conflict || (note.deleted_time && note.deleted_time > 0)) {
			await NoteEmbedding.deleteByNoteId(noteId);
			return;
		}

		const body = (note.body ?? '').trim();
		const title = (note.title ?? '').trim();
		if (!body && !title) {
			// Notes with neither a title nor a body have no meaningful signal
			// to embed. Make sure any stale rows from a previous edit are
			// cleaned up.
			await NoteEmbedding.deleteByNoteId(noteId);
			return;
		}

		const chunks = chunkText(body);

		// Inject the title into the first chunk twice. The title is often the
		// densest semantic signal a note carries — e.g. "Pet sitters for my
		// dog" with a body that's just an attachment reference. Without this,
		// searching for "dog walker" would never find that note because the
		// body has no relevant content.
		//
		// Why double, and why only chunk 0?
		// - Doubling boosts the title's weight in the chunk's embedding so
		//   title-anchored queries pull harder on this note.
		// - Chunk 0 is the natural place to put it because it's also where
		//   the body opening lives, which usually flows from the title.
		if (title) {
			if (chunks.length === 0) {
				chunks.push(title);
			} else {
				chunks[0] = `${title}\n\n${title}\n\n${chunks[0]}`;
			}
		}

		if (chunks.length === 0) {
			await NoteEmbedding.deleteByNoteId(noteId);
			return;
		}

		const vectors = await provider.embed(chunks);
		if (vectors.length !== chunks.length) {
			throw new Error(`Provider returned ${vectors.length} vectors for ${chunks.length} chunks`);
		}

		const payload = chunks.map((text, i) => ({
			chunkIndex: i,
			chunkText: text,
			vector: vectors[i],
		}));

		await NoteEmbedding.saveChunks(noteId, provider.modelId, payload);
	}

	// Reset state — exposed for tests and for a future "re-index all" button.
	public async clearProgress() {
		await NoteEmbedding.clearAll();
		Setting.setValue('ai.embedding.lastProcessedChangeId', 0);
		Setting.setValue('ai.embedding.lastIndexedModelId', '');
	}
}
