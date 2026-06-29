import { setupDatabaseAndSynchronizer, switchClient, db, msleep } from '../../testing/test-utils';
import Setting from '../../models/Setting';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import ItemChange from '../../models/ItemChange';
import NoteEmbedding from '../../models/NoteEmbedding';
import AiService from './AiService';
import EmbeddingIndexer, { coarseStateFrom } from './EmbeddingIndexer';
import { IndexStatus } from './types';
import TestEmbeddingProvider from './testing/TestEmbeddingProvider';

// Note.save() and Note.delete() record ItemChange rows fire-and-forget
// (`void ItemChange.add(...)`). In production that's fine because the indexer
// runs on a 5-minute timer. In tests we need to wait for the write to land.
const waitForChangesSince = async (changeId: number, expectedCount: number) => {
	for (let i = 0; i < 50; i++) {
		const changes = await ItemChange.changesSinceId(changeId);
		if (changes.length >= expectedCount) return;
		await msleep(20);
	}
	throw new Error(`Timed out waiting for ${expectedCount} ItemChange row(s) past ${changeId}`);
};

// End-to-end pipeline test: create notes → run the indexer → confirm
// similaritySearch returns the right note via the test embedding provider.
// Uses the test stub provider so no real model is needed.

describe('EmbeddingIndexer', () => {

	let provider: TestEmbeddingProvider;

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		provider = new TestEmbeddingProvider();
		AiService.instance().setEmbeddingProvider(provider);
	});

	afterEach(async () => {
		AiService.instance().setEmbeddingProvider(null);
		await EmbeddingIndexer.instance().stopRunInBackground();
	});

	const skipIfNoVec = () => {
		if (!db(1).sqliteVecAvailable()) {
			// eslint-disable-next-line no-console
			console.warn('Skipping EmbeddingIndexer test: sqlite-vec unavailable');
			return true;
		}
		return false;
	};

	it('does nothing when no provider is installed', async () => {
		if (skipIfNoVec()) return;
		AiService.instance().setEmbeddingProvider(null);
		const folder = await Folder.save({ title: 'f' });
		await Note.save({ title: 't', body: 'cats are nice', parent_id: folder.id });

		await EmbeddingIndexer.instance().maintenance();

		expect(await NoteEmbedding.distinctNoteIdCount()).toBe(0);
	});

	it('ai.embedding.enabled defaults to true', async () => {
		// Indexing should be on by design when AI is enabled, with the toggle
		// available as a kill switch for users who want chat-only.
		expect(Setting.value('ai.embedding.enabled')).toBe(true);
	});

	it('indexes a new note end-to-end via the test provider', async () => {
		if (skipIfNoVec()) return;
		const folder = await Folder.save({ title: 'f' });
		const note = await Note.save({
			title: 'About cats',
			body: 'Cats and kittens are wonderful animals',
			parent_id: folder.id,
		});
		await waitForChangesSince(0, 1);

		await EmbeddingIndexer.instance().maintenance();

		const rows = await NoteEmbedding.byNoteId(note.id);
		expect(rows.length).toBeGreaterThan(0);
		expect(rows[0].model_id).toBe('test-model-v1');
		expect(await NoteEmbedding.distinctNoteIdCount()).toBe(1);
	});

	it('returns the more relevant note first from similaritySearch', async () => {
		if (skipIfNoVec()) return;
		const folder = await Folder.save({ title: 'f' });
		const catNote = await Note.save({
			title: 'cats',
			body: 'Cats and kittens love to play and sleep all day',
			parent_id: folder.id,
		});
		await Note.save({
			title: 'cars',
			body: 'Engines and pistons need regular maintenance and oil',
			parent_id: folder.id,
		});
		await waitForChangesSince(0, 2);

		await EmbeddingIndexer.instance().maintenance();

		const [queryVec] = await provider.embed(['kittens']);
		const results = await NoteEmbedding.similaritySearch(queryVec, { k: 5 });

		expect(results.length).toBeGreaterThan(0);
		// The first match must come from the cat note, not the car note.
		expect(results[0].noteId).toBe(catNote.id);
	});

	it('removes embeddings for a deleted note on the next maintenance', async () => {
		if (skipIfNoVec()) return;
		const folder = await Folder.save({ title: 'f' });
		const note = await Note.save({ title: 't', body: 'some body text', parent_id: folder.id });
		await waitForChangesSince(0, 1);

		await EmbeddingIndexer.instance().maintenance();
		expect(await NoteEmbedding.countByNoteId(note.id)).toBeGreaterThan(0);

		const cursorAfterFirst = Setting.value('ai.embedding.lastProcessedChangeId') as number;
		await Note.delete(note.id);
		await waitForChangesSince(cursorAfterFirst, 1);

		await EmbeddingIndexer.instance().maintenance();
		expect(await NoteEmbedding.countByNoteId(note.id)).toBe(0);
	});

	it('removes embeddings for a locked note on the next maintenance', async () => {
		if (skipIfNoVec()) return;
		const folder = await Folder.save({ title: 'f' });
		const note = await Note.save({ title: 't', body: 'some body text', parent_id: folder.id });
		await waitForChangesSince(0, 1);

		await EmbeddingIndexer.instance().maintenance();
		expect(await NoteEmbedding.countByNoteId(note.id)).toBeGreaterThan(0);

		const cursorAfterFirst = Setting.value('ai.embedding.lastProcessedChangeId') as number;
		await Note.save({ id: note.id, is_locked: 1 });
		await waitForChangesSince(cursorAfterFirst, 1);

		await EmbeddingIndexer.instance().maintenance();
		expect(await NoteEmbedding.countByNoteId(note.id)).toBe(0);
	});

	it('skips trashed and conflict notes', async () => {
		if (skipIfNoVec()) return;
		const folder = await Folder.save({ title: 'f' });
		const trashedNote = await Note.save({
			title: 'trashed',
			body: 'this is in the trash',
			parent_id: folder.id,
		});
		await Note.save({ ...trashedNote, deleted_time: Date.now() });

		const conflictNote = await Note.save({
			title: 'conflict',
			body: 'this is a conflict',
			parent_id: folder.id,
			is_conflict: 1,
		});
		await waitForChangesSince(0, 2);

		await EmbeddingIndexer.instance().maintenance();

		expect(await NoteEmbedding.countByNoteId(trashedNote.id)).toBe(0);
		expect(await NoteEmbedding.countByNoteId(conflictNote.id)).toBe(0);
	});

	it('skips notes with neither a title nor a body', async () => {
		if (skipIfNoVec()) return;
		const folder = await Folder.save({ title: 'f' });
		const note = await Note.save({ title: '', body: '', parent_id: folder.id });
		await waitForChangesSince(0, 1);

		await EmbeddingIndexer.instance().maintenance();

		expect(await NoteEmbedding.countByNoteId(note.id)).toBe(0);
	});

	it('indexes a note that has only a title (empty body)', async () => {
		if (skipIfNoVec()) return;
		const folder = await Folder.save({ title: 'f' });
		const note = await Note.save({ title: 'My therapist phone number', body: '', parent_id: folder.id });
		await waitForChangesSince(0, 1);

		await EmbeddingIndexer.instance().maintenance();

		// A note with a title only is real signal — the user can ask "what's my
		// therapist's number" and expect this to come up. So it must be indexed.
		expect(await NoteEmbedding.countByNoteId(note.id)).toBe(1);
	});

	it('embeds the title alongside the body so title-anchored queries match', async () => {
		if (skipIfNoVec()) return;
		const folder = await Folder.save({ title: 'f' });
		// Body has nothing about dogs — only the title carries that signal.
		// Without title indexing, this note would be invisible to "dog walker".
		const dogNote = await Note.save({
			title: 'Pet sitters for my dog',
			body: 'see attached pdf for contact details',
			parent_id: folder.id,
		});
		await Note.save({
			title: 'shopping list',
			body: 'milk eggs bread butter cheese',
			parent_id: folder.id,
		});
		await waitForChangesSince(0, 2);

		await EmbeddingIndexer.instance().maintenance();

		const [queryVec] = await provider.embed(['dog walker']);
		const results = await NoteEmbedding.similaritySearch(queryVec, { k: 5 });

		expect(results.length).toBeGreaterThan(0);
		expect(results[0].noteId).toBe(dogNote.id);
	});

	it('advances the change-id cursor', async () => {
		if (skipIfNoVec()) return;
		const folder = await Folder.save({ title: 'f' });
		await Note.save({ title: 't', body: 'something', parent_id: folder.id });
		await waitForChangesSince(0, 1);

		expect(Setting.value('ai.embedding.lastProcessedChangeId')).toBe(0);
		await EmbeddingIndexer.instance().maintenance();
		expect(Setting.value('ai.embedding.lastProcessedChangeId') as number).toBeGreaterThan(0);
	});

	it('clears the index and resets the cursor when the model id changes', async () => {
		if (skipIfNoVec()) return;
		const folder = await Folder.save({ title: 'f' });
		await Note.save({ title: 't', body: 'something to index', parent_id: folder.id });
		await waitForChangesSince(0, 1);

		await EmbeddingIndexer.instance().maintenance();
		expect(await NoteEmbedding.distinctNoteIdCount()).toBe(1);

		// Swap the provider for one with a different modelId — simulates the
		// user picking a different embedding model.
		AiService.instance().setEmbeddingProvider(new TestEmbeddingProvider({ modelId: 'test-model-v2' }));
		await EmbeddingIndexer.instance().maintenance();

		// The whole index should be rebuilt under the new model.
		expect(Setting.value('ai.embedding.lastIndexedModelId')).toBe('test-model-v2');
		expect(await NoteEmbedding.distinctNoteIdCount()).toBe(1);
	});

	it('does not concurrently overlap maintenance runs', async () => {
		if (skipIfNoVec()) return;
		// Two maintenance calls back-to-back should be safe even when the
		// first hasn't returned yet — the second short-circuits via the
		// in-flight flag.
		const folder = await Folder.save({ title: 'f' });
		await Note.save({ title: 't', body: 'body', parent_id: folder.id });
		await waitForChangesSince(0, 1);

		await Promise.all([
			EmbeddingIndexer.instance().maintenance(),
			EmbeddingIndexer.instance().maintenance(),
		]);

		expect(await NoteEmbedding.distinctNoteIdCount()).toBe(1);
	});

	it('getStatus reports unavailable when no provider is active', async () => {
		AiService.instance().setEmbeddingProvider(null);
		const status = await EmbeddingIndexer.instance().getStatus();
		expect(status.modelDownloadStatus).toBe('unavailable');
	});

	it('getStatus distinguishes between AI-off and indexing-off', async () => {
		Setting.setValue('ai.enabled', false);
		try {
			const status = await EmbeddingIndexer.instance().getStatus();
			expect(status.indexerState).toBe('ai-disabled');
		} finally {
			Setting.setValue('ai.enabled', true);
		}

		Setting.setValue('ai.embedding.enabled', false);
		try {
			const status = await EmbeddingIndexer.instance().getStatus();
			expect(status.indexerState).toBe('index-disabled');
		} finally {
			Setting.setValue('ai.embedding.enabled', true);
		}
	});

	it('getStatus reports downloaded for providers without a download stage', async () => {
		// The bigram test provider doesn't expose modelDownloadStatus, so the
		// reporter should treat it as "always ready" — i.e. 'downloaded' from
		// the UI's point of view.
		const status = await EmbeddingIndexer.instance().getStatus();
		expect(status.modelDownloadStatus).toBe('downloaded');
	});

	it('backfills notes whose item_changes are already past the cursor', async () => {
		if (skipIfNoVec()) return;
		// Simulate "existing notes on first AI enable": the notes have
		// already produced item_changes, but the cursor is set past them as
		// if the indexer had nothing to chew on from the change feed.
		const folder = await Folder.save({ title: 'f' });
		await Note.save({ title: 'A', body: 'apples', parent_id: folder.id });
		await Note.save({ title: 'B', body: 'bananas', parent_id: folder.id });
		const locked = await Note.save({ title: 'C', body: 'cherries', parent_id: folder.id, is_locked: 1 });
		await waitForChangesSince(0, 3);
		const lastChange = await ItemChange.lastChangeId();
		Setting.setValue('ai.embedding.lastProcessedChangeId', lastChange);

		await EmbeddingIndexer.instance().maintenance();
		await EmbeddingIndexer.instance().maintenance();

		// The unlocked notes should be indexed via the backfill path even though no
		// new item_changes were available.
		expect(await NoteEmbedding.distinctNoteIdCount()).toBe(2);
		expect(await NoteEmbedding.countByNoteId(locked.id)).toBe(0);
		expect(Setting.value('ai.embedding.initialScanDone')).toBe(true);
		expect((await EmbeddingIndexer.instance().getStatus()).totalNotes).toBe(2);
	});

	it('skips a note that fails during the initial scan instead of looping on it', async () => {
		if (skipIfNoVec()) return;
		const folder = await Folder.save({ title: 'f' });
		const good = await Note.save({ title: 'good', body: 'this one works', parent_id: folder.id });
		const bad = await Note.save({ title: 'bad', body: 'this one will fail', parent_id: folder.id });
		await waitForChangesSince(0, 2);

		// Provider that throws for the bad note's body, succeeds for everything else.
		let failureCalls = 0;
		const failingProvider = new (class extends TestEmbeddingProvider {
			public async embed(texts: string[]) {
				if (texts.some(t => t.includes('this one will fail'))) {
					failureCalls++;
					throw new Error('synthetic failure');
				}
				return super.embed(texts);
			}
		})();
		AiService.instance().setEmbeddingProvider(failingProvider);

		// First tick processes both — bad fails, good succeeds.
		await EmbeddingIndexer.instance().maintenance();
		// Second tick must NOT retry the bad note (would re-incur failureCalls).
		await EmbeddingIndexer.instance().maintenance();
		await EmbeddingIndexer.instance().maintenance();

		expect(failureCalls).toBe(1);
		expect(await NoteEmbedding.countByNoteId(good.id)).toBeGreaterThan(0);
		expect(await NoteEmbedding.countByNoteId(bad.id)).toBe(0);
		expect(Setting.value('ai.embedding.initialScanDone')).toBe(true);
	});

	it('does not start in background when vector search is unavailable', async () => {
		// On platforms where the sqlite-vec extension fails to load (see
		// #15761) the indexer would otherwise pull every note into the
		// expensive embedding provider and then throw at saveChunks — burning
		// CPU/memory on every tick for no result. Confirm we bail at startup
		// and surface the state to the UI instead.
		Setting.setValue('ai.enabled', true);
		const spy = jest.spyOn(NoteEmbedding, 'vectorSearchAvailable').mockReturnValue(false);
		try {
			await EmbeddingIndexer.instance().runInBackground();
			const status = await EmbeddingIndexer.instance().getStatus();
			expect(status.indexerState).toBe('vector-search-unavailable');
		} finally {
			spy.mockRestore();
			Setting.setValue('ai.enabled', false);
			await EmbeddingIndexer.instance().stopRunInBackground();
		}
	});

	test.each([
		{ name: 'unavailable wins over disabled',
			status: { indexerState: 'vector-search-unavailable', modelDownloadStatus: 'unavailable', notesIndexed: 0, totalNotes: 0 },
			expected: 'unavailable' },
		{ name: 'ai-disabled → disabled',
			status: { indexerState: 'ai-disabled', modelDownloadStatus: 'downloaded', notesIndexed: 0, totalNotes: 0 },
			expected: 'disabled' },
		{ name: 'index-disabled → disabled',
			status: { indexerState: 'index-disabled', modelDownloadStatus: 'downloaded', notesIndexed: 0, totalNotes: 0 },
			expected: 'disabled' },
		{ name: 'no provider but enabled → preparing',
			status: { indexerState: 'idle', modelDownloadStatus: 'unavailable', notesIndexed: 0, totalNotes: 0 },
			expected: 'preparing' },
		{ name: 'model downloading → preparing',
			status: { indexerState: 'idle', modelDownloadStatus: 'downloading', notesIndexed: 0, totalNotes: 0 },
			expected: 'preparing' },
		{ name: 'model not-started → preparing',
			status: { indexerState: 'idle', modelDownloadStatus: 'not-started', notesIndexed: 0, totalNotes: 0 },
			expected: 'preparing' },
		{ name: 'running with model ready → indexing',
			status: { indexerState: 'running', modelDownloadStatus: 'downloaded', notesIndexed: 1, totalNotes: 5 },
			expected: 'indexing' },
		{ name: 'idle with model ready → ready',
			status: { indexerState: 'idle', modelDownloadStatus: 'downloaded', notesIndexed: 3, totalNotes: 3 },
			expected: 'ready' },
	] as { name: string; status: IndexStatus; expected: string }[])('coarseStateFrom: $name', ({ status, expected }) => {
		expect(coarseStateFrom(status)).toBe(expected);
	});

	it('getPluginStatus: ready is false until at least one note is indexed', async () => {
		if (skipIfNoVec()) return;
		Setting.setValue('ai.enabled', true);
		// note_embeddings isn't reset by test-utils — start clean.
		await NoteEmbedding.clearAll();
		try {
			const before = await EmbeddingIndexer.instance().getPluginStatus();
			expect(before.state).toBe('ready');
			expect(before.ready).toBe(false);
			expect(before.modelId).toBe(provider.modelId);

			const folder = await Folder.save({ title: 'f' });
			await Note.save({ title: 't', body: 'something', parent_id: folder.id });
			await waitForChangesSince(0, 1);
			await EmbeddingIndexer.instance().maintenance();

			const after = await EmbeddingIndexer.instance().getPluginStatus();
			expect(after.state).toBe('ready');
			expect(after.ready).toBe(true);
			expect(after.notesIndexed).toBe(1);
		} finally {
			Setting.setValue('ai.enabled', false);
		}
	});

	it('getPluginStatus: modelId is null when no provider is active', async () => {
		const original = AiService.instance().getActiveEmbeddingProvider();
		AiService.instance().setEmbeddingProvider(null);
		try {
			const status = await EmbeddingIndexer.instance().getPluginStatus();
			expect(status.modelId).toBeNull();
			expect(status.ready).toBe(false);
		} finally {
			AiService.instance().setEmbeddingProvider(original);
		}
	});

	it('getStatus counts indexed vs total notes and excludes trashed ones', async () => {
		if (skipIfNoVec()) return;
		const folder = await Folder.save({ title: 'f' });
		await Note.save({ title: 'A', body: 'apples are red', parent_id: folder.id });
		await Note.save({ title: 'B', body: 'bananas are yellow', parent_id: folder.id });
		const trashed = await Note.save({ title: 'C', body: 'cherries', parent_id: folder.id });
		// Move the third note to trash so it should be excluded from totalNotes.
		await Note.batchDelete([trashed.id], { toTrash: true });
		await waitForChangesSince(0, 3);
		await EmbeddingIndexer.instance().maintenance();

		const status = await EmbeddingIndexer.instance().getStatus();
		expect(status.totalNotes).toBe(2);
		expect(status.notesIndexed).toBeGreaterThanOrEqual(1);
		expect(status.notesIndexed).toBeLessThanOrEqual(2);
	});
});
