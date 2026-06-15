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

// Matches OcrService — slow enough to avoid burning CPU on every edit,
// fast enough that newly-saved notes are searchable within minutes.
const MAINTENANCE_INTERVAL = 5 * Minute;

// Caps both the per-tick change-feed drain and the backfill top-up.
const BATCH_SIZE = 100;

// Background service that watches `item_changes`, chunks each modified note,
// embeds the chunks via the active EmbeddingProvider, and stores them in
// NoteEmbedding. Progress is durable via two settings: a cursor into
// item_changes, and the modelId that produced the current vectors (a mismatch
// triggers a clear-and-rebuild — vectors from different models aren't
// comparable).

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
		// Fire-and-forget the first tick: model load + first embed batch can
		// be 5-15s and would otherwise block app startup.
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

	// Snapshot of indexer + model state for the settings UI. Cheap enough to
	// poll on a UI tick (two COUNTs + a provider probe).
	public async getStatus(): Promise<IndexStatus> {
		const provider = AiService.instance().getActiveEmbeddingProvider();

		let modelDownloadStatus: IndexStatus['modelDownloadStatus'] = 'unavailable';
		if (provider) {
			// Providers without a downloadable artefact (remote, test stub)
			// surface as 'downloaded' so the UI doesn't need a special case.
			modelDownloadStatus = provider.modelDownloadStatus
				? await provider.modelDownloadStatus()
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

		// Both counts exclude trashed/conflict notes so the displayed ratio
		// matches the indexer's universe.
		const notesIndexed = await NoteEmbedding.distinctNoteIdCount();
		const totalNotes = await Note.indexableCount();

		return { modelDownloadStatus, indexerState, notesIndexed, totalNotes };
	}

	// Single maintenance tick. Public so tests can drive it without waiting
	// for the timer.
	public async maintenance() {
		if (this.maintenanceRunning_) return;
		this.maintenanceRunning_ = true;
		try {
			const provider = AiService.instance().getActiveEmbeddingProvider();
			if (!provider) return;

			await this.handleModelChange(provider);
			// Change feed first so recent edits aren't starved by a large
			// backfill of pre-existing notes.
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

	// Wipe-and-rebuild when the active provider's modelId changes — vectors
	// from different models aren't comparable.
	private async handleModelChange(provider: EmbeddingProvider) {
		const lastModelId = Setting.value('ai.embedding.lastIndexedModelId') as string;
		if (lastModelId === provider.modelId) return;

		logger.info(`Embedding model changed (${lastModelId || '<none>'} → ${provider.modelId}). Clearing and re-indexing.`);
		await NoteEmbedding.clearAll();
		Setting.setValue('ai.embedding.lastProcessedChangeId', 0);
		Setting.setValue('ai.embedding.lastIndexedModelId', provider.modelId);
	}

	private async processChangeBatch(provider: EmbeddingProvider): Promise<number> {
		const cursor = Setting.value('ai.embedding.lastProcessedChangeId') as number;
		const changes = await ItemChange.changesSinceId(cursor, { limit: BATCH_SIZE });
		if (!changes.length) return 0;

		// Collapse duplicates so a note edited multiple times only gets
		// embedded once per tick.
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
				logger.warn(`Failed to index note ${noteId}:`, error);
			}
		}

		// Advance the cursor only after the batch finishes. A mid-batch crash
		// reprocesses everything from the previous cursor (saveChunks is
		// idempotent — it deletes existing chunks first).
		const highestId = changes[changes.length - 1].id;
		Setting.setValue('ai.embedding.lastProcessedChangeId', highestId);

		return latestPerNote.size;
	}

	// Picks up notes that aren't yet in the index — existing notes on first
	// AI enable, or notes that pre-date the feature.
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
		if (!note || note.is_conflict || (note.deleted_time && note.deleted_time > 0)) {
			await NoteEmbedding.deleteByNoteId(noteId);
			return;
		}

		const body = (note.body ?? '').trim();
		const title = (note.title ?? '').trim();
		if (!body && !title) {
			await NoteEmbedding.deleteByNoteId(noteId);
			return;
		}

		const chunks = chunkText(body);

		// Title is often the densest semantic signal (e.g. "Pet sitters for
		// my dog" with a body that's just an attachment link). Doubling it
		// into chunk 0 boosts its weight so title-anchored queries hit.
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
}
