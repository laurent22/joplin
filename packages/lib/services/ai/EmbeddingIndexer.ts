import Setting from '../../models/Setting';
import shim from '../../shim';
import Logger from '@joplin/utils/Logger';
import { Minute, Second } from '@joplin/utils/time';
import { ModelType } from '../../BaseModel';
import ItemChange from '../../models/ItemChange';
import Note from '../../models/Note';
import { NoteEntity, ItemChangeEntity } from '../database/types';
import NoteEmbedding from '../../models/NoteEmbedding';
import AiService from './AiService';
import { chunkText } from './chunker';
import { EmbeddingProvider, IndexStatus } from './types';

const logger = Logger.create('EmbeddingIndexer');

// Tick cadence after the initial scan is done — slow enough to avoid burning
// CPU on every edit, fast enough that newly-saved notes are searchable
// within a few minutes.
const maintenanceInterval = 3 * Minute;

// Tick cadence while the initial scan is still walking the vault. Aggressive
// because the user just opted in and expects activity; ticks rarely run
// back-to-back because the per-tick work caps via `maintenanceRunning_`.
const initialScanInterval = 30 * Second;

// Caps both the per-tick change-feed drain and the backfill top-up.
const batchSize = 100;

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

	private maintenanceTimer_: ReturnType<typeof shim.setTimeout> = null;
	private isRunningInBackground_ = false;
	private maintenanceRunning_ = false;
	// Notes that threw during this session's initial scan. Skipped for the
	// remainder of the session so the scan can complete; reset on process
	// restart so a fix to the underlying issue gets a fresh chance.
	private initialScanFailures_ = new Set<string>();

	public async runInBackground() {
		if (this.isRunningInBackground_) return;

		// Without sqlite-vec we can run the embedding provider (potentially
		// expensive ONNX inference) but have nowhere to store the vectors, so
		// every note would fail at saveChunks. Bail before starting the timer
		// so we don't burn CPU/memory for nothing on platforms where the
		// extension didn't load (see #15761).
		if (!NoteEmbedding.vectorSearchAvailable()) {
			logger.warn('Not starting background indexer: sqlite-vec extension is not loaded on this platform');
			return;
		}

		this.isRunningInBackground_ = true;

		logger.info('Starting background indexer');
		// Fire-and-forget the first tick: model load + first embed batch can
		// be 5-15s and would otherwise block app startup.
		void this.maintenance();

		this.scheduleNextTick();
	}

	public async stopRunInBackground() {
		if (!this.isRunningInBackground_) return;
		logger.info('Stopping background indexer');
		if (this.maintenanceTimer_) shim.clearTimeout(this.maintenanceTimer_);
		this.maintenanceTimer_ = null;
		this.isRunningInBackground_ = false;
	}

	// Cadence switches between an aggressive initial-scan tempo and a relaxed
	// steady-state tempo. Re-evaluated after each tick so the switch happens
	// the moment the scan completes, not on the next process restart.
	private scheduleNextTick() {
		if (!this.isRunningInBackground_) return;
		const interval = Setting.value('ai.embedding.initialScanDone')
			? maintenanceInterval
			: initialScanInterval;
		this.maintenanceTimer_ = shim.setTimeout(async () => {
			await this.maintenance();
			this.scheduleNextTick();
		}, interval);
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
		} else if (!NoteEmbedding.vectorSearchAvailable()) {
			indexerState = 'vector-search-unavailable';
		} else if (this.maintenanceRunning_) {
			indexerState = 'running';
		} else {
			indexerState = 'idle';
		}

		// Both counts exclude trashed, conflict, and locked notes so the displayed ratio
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
			// Until the initial scan completes, walk the whole vault one batch
			// per tick. Then switch to change-feed-only mode. The tick that
			// finishes the scan still runs the change feed so edits made
			// during the scan don't wait an extra interval.
			if (!Setting.value('ai.embedding.initialScanDone')) {
				await this.runInitialScanBatch(provider);
			}
			if (Setting.value('ai.embedding.initialScanDone')) {
				await this.processChangeBatch(provider);
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
		Setting.setValue('ai.embedding.initialScanDone', false);
		this.initialScanFailures_.clear();
	}

	private async processChangeBatch(provider: EmbeddingProvider): Promise<void> {
		const cursor = Setting.value('ai.embedding.lastProcessedChangeId') as number;
		const changes = await ItemChange.changesSinceId(cursor, { limit: batchSize });
		if (!changes.length) return;

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
	}

	// Walks the full notes table on first enable (or after a model swap).
	// One batch per tick so the indexer stays responsive on big vaults.
	// Per-note failures are remembered in-memory only — they get a fresh
	// attempt on the next session, which is when a fix to the underlying
	// issue would have been deployed.
	private async runInitialScanBatch(provider: EmbeddingProvider): Promise<void> {
		// Snap the change-feed cursor at the start of the scan, not the end —
		// edits and deletes that happen during the scan are then picked up
		// normally by the change feed instead of being lost.
		if ((Setting.value('ai.embedding.lastProcessedChangeId') as number) === 0) {
			Setting.setValue('ai.embedding.lastProcessedChangeId', await ItemChange.lastChangeId());
		}

		const excluded = Array.from(this.initialScanFailures_);
		const noteIds = await NoteEmbedding.notYetIndexedNoteIds(batchSize, excluded);

		if (!noteIds.length) {
			Setting.setValue('ai.embedding.initialScanDone', true);
			logger.info(`Initial scan complete (${this.initialScanFailures_.size} note(s) skipped after errors)`);
			return;
		}

		logger.info(`Initial scan: indexing ${noteIds.length} note(s)`);
		for (const noteId of noteIds) {
			try {
				await this.indexNote(noteId, provider);
			} catch (error) {
				this.initialScanFailures_.add(noteId);
				logger.warn(`Initial scan failed for note ${noteId} (will retry next session):`, error);
			}
		}
	}

	private async indexNote(noteId: string, provider: EmbeddingProvider) {
		const note = await Note.load(noteId) as NoteEntity | null;
		if (!note || note.is_locked || note.is_conflict || (note.deleted_time && note.deleted_time > 0)) {
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
