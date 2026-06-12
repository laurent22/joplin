import { setupDatabaseAndSynchronizer, switchClient, db, msleep } from '../../testing/test-utils';
import Setting from '../../models/Setting';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import ItemChange from '../../models/ItemChange';
import NoteEmbedding from '../../models/NoteEmbedding';
import AiService from './AiService';
import EmbeddingIndexer from './EmbeddingIndexer';
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

	it('skips notes with empty bodies', async () => {
		if (skipIfNoVec()) return;
		const folder = await Folder.save({ title: 'f' });
		const note = await Note.save({ title: 'title only', body: '', parent_id: folder.id });
		await waitForChangesSince(0, 1);

		await EmbeddingIndexer.instance().maintenance();

		expect(await NoteEmbedding.countByNoteId(note.id)).toBe(0);
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
});
