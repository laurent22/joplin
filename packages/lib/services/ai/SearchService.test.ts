import { setupDatabaseAndSynchronizer, switchClient, db, msleep } from '../../testing/test-utils';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import Tag from '../../models/Tag';
import ItemChange from '../../models/ItemChange';
import AiService from './AiService';
import EmbeddingIndexer from './EmbeddingIndexer';
import SearchService from './SearchService';
import TestEmbeddingProvider from './testing/TestEmbeddingProvider';

// End-to-end: index a small corpus with the test embedding provider, then
// confirm SearchService returns the expected notes for text + noteId queries
// across the supported scopes. The test provider is bigram-based, so similar
// strings rank higher than unrelated ones — good enough to verify ranking
// behaviour, not the model itself.

const waitForChangesSince = async (changeId: number, expectedCount: number) => {
	for (let i = 0; i < 50; i++) {
		const changes = await ItemChange.changesSinceId(changeId);
		if (changes.length >= expectedCount) return;
		await msleep(20);
	}
	throw new Error(`Timed out waiting for ${expectedCount} ItemChange row(s) past ${changeId}`);
};

describe('SearchService', () => {

	let provider: TestEmbeddingProvider;

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		// Use a higher dimension and a 'loose' default threshold during the
		// search so the bigram-based test provider can produce non-zero
		// similarity. minScore is small enough to admit anything that overlaps.
		provider = new TestEmbeddingProvider({ dimension: 64 });
		AiService.instance().setEmbeddingProvider(provider);
	});

	afterEach(async () => {
		AiService.instance().setEmbeddingProvider(null);
		await EmbeddingIndexer.instance().stopRunInBackground();
	});

	const skipIfNoVec = () => {
		if (!db(1).sqliteVecAvailable()) {
			// eslint-disable-next-line no-console
			console.warn('Skipping SearchService test: sqlite-vec unavailable');
			return true;
		}
		return false;
	};

	const seed = async () => {
		const folderA = await Folder.save({ title: 'A' });
		const folderB = await Folder.save({ title: 'B' });
		const catNote = await Note.save({ title: 'Cats', body: 'cats and kittens love yarn', parent_id: folderA.id });
		const dogNote = await Note.save({ title: 'Dogs', body: 'dogs and puppies chase sticks', parent_id: folderA.id });
		const carNote = await Note.save({ title: 'Cars', body: 'sedans and SUVs share roads', parent_id: folderB.id });
		await waitForChangesSince(0, 3);
		await EmbeddingIndexer.instance().maintenance();
		return { folderA, folderB, catNote, dogNote, carNote };
	};

	it('throws when no embedding provider is active', async () => {
		AiService.instance().setEmbeddingProvider(null);
		await expect(SearchService.instance().search({ query: { text: 'anything' } }))
			.rejects.toThrow(/No embedding provider/);
	});

	it('returns the closest note first for a text query', async () => {
		if (skipIfNoVec()) return;
		const { catNote } = await seed();

		const results = await SearchService.instance().search({
			query: { text: 'kittens and cats' },
			relevance: 'loose',
		});

		expect(results.length).toBeGreaterThan(0);
		expect(results[0].noteId).toBe(catNote.id);
		// Scores are cosine similarity in [0, 1]; ranking must be descending.
		for (let i = 1; i < results.length; i++) {
			expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
		}
	});

	it('returns nothing for an empty query string', async () => {
		if (skipIfNoVec()) return;
		await seed();
		const results = await SearchService.instance().search({ query: { text: '   ' } });
		expect(results).toEqual([]);
	});

	it('restricts to a folder when scope is folder', async () => {
		if (skipIfNoVec()) return;
		const { folderB, carNote } = await seed();

		// Query by the note's own id — guarantees a hit (self-match) so the
		// "scope restricts results" check below is non-vacuous. Bigram-only
		// text queries can return zero results past the threshold.
		const results = await SearchService.instance().search({
			query: { noteId: carNote.id },
			scope: { type: 'folder', folderId: folderB.id },
			relevance: 'loose',
		});

		expect(results.length).toBeGreaterThan(0);
		for (const r of results) {
			expect(r.noteId).toBe(carNote.id);
		}
	});

	it('restricts to a tag when scope is tag', async () => {
		if (skipIfNoVec()) return;
		const { catNote, dogNote } = await seed();
		const tag = await Tag.save({ title: 'pets' });
		await Tag.addNote(tag.id, catNote.id);
		await Tag.addNote(tag.id, dogNote.id);

		const results = await SearchService.instance().search({
			query: { text: 'cats kittens' },
			scope: { type: 'tag', tagId: tag.id },
			relevance: 'loose',
		});

		const seen = new Set(results.map(r => r.noteId));
		expect(seen.size).toBeGreaterThan(0);
		for (const id of seen) {
			expect([catNote.id, dogNote.id]).toContain(id);
		}
	});

	it('returns an empty array when the tag has no notes', async () => {
		if (skipIfNoVec()) return;
		await seed();
		const tag = await Tag.save({ title: 'unused' });
		const results = await SearchService.instance().search({
			query: { text: 'cats' },
			scope: { type: 'tag', tagId: tag.id },
			relevance: 'loose',
		});
		expect(results).toEqual([]);
	});

	it('reuses indexed vectors when querying by noteId', async () => {
		if (skipIfNoVec()) return;
		const { catNote } = await seed();

		// A noteId query reuses the note's stored chunks as the query vectors,
		// so it should never call embed() / embedQuery() on the provider.
		let embedCalls = 0;
		let embedQueryCalls = 0;
		class CountingProvider extends TestEmbeddingProvider {
			public async embed(texts: string[]) { embedCalls++; return super.embed(texts); }
			public async embedQuery(texts: string[]) { embedQueryCalls++; return super.embed(texts); }
		}
		AiService.instance().setEmbeddingProvider(new CountingProvider({ dimension: 64 }));

		const results = await SearchService.instance().search({
			query: { noteId: catNote.id },
			relevance: 'loose',
		});

		expect(embedCalls).toBe(0);
		expect(embedQueryCalls).toBe(0);
		// The note compared against its own vectors should always score
		// itself as a top hit.
		expect(results.length).toBeGreaterThan(0);
		expect(results[0].noteId).toBe(catNote.id);
	});

	it('returns an empty array when querying by a noteId that has no embeddings', async () => {
		if (skipIfNoVec()) return;
		const folder = await Folder.save({ title: 'f' });
		const note = await Note.save({ body: 'never indexed', parent_id: folder.id });
		// Skipping the indexer run on purpose — no embeddings exist for this note.
		const results = await SearchService.instance().search({
			query: { noteId: note.id },
			relevance: 'loose',
		});
		expect(results).toEqual([]);
	});

	it('strict relevance returns fewer, higher-quality results than loose', async () => {
		if (skipIfNoVec()) return;
		await seed();
		const loose = await SearchService.instance().search({
			query: { text: 'cats kittens yarn' },
			relevance: 'loose',
		});
		const strict = await SearchService.instance().search({
			query: { text: 'cats kittens yarn' },
			relevance: 'strict',
		});
		// strict may legitimately return zero if no score clears 0.55 with the
		// test provider's bigram embedding; assert only the monotonic property.
		expect(strict.length).toBeLessThanOrEqual(loose.length);
	});

	it('getEmbeddings: throws when no embedding provider is active', async () => {
		AiService.instance().setEmbeddingProvider(null);
		await expect(SearchService.instance().getEmbeddings())
			.rejects.toThrow(/No embedding provider/);
	});

	it('getEmbeddings: returns chunks with raw vectors and model metadata', async () => {
		if (skipIfNoVec()) return;
		const { catNote, dogNote, carNote } = await seed();

		const page = await SearchService.instance().getEmbeddings();

		expect(page.modelId).toBe(provider.modelId);
		expect(page.dimension).toBe(64);
		expect(page.chunks.length).toBeGreaterThanOrEqual(3);
		for (const chunk of page.chunks) {
			expect(chunk.vector).toHaveLength(64);
			expect(typeof chunk.chunkText).toBe('string');
		}
		const seenNotes = new Set(page.chunks.map(c => c.noteId));
		expect(seenNotes).toEqual(new Set([catNote.id, dogNote.id, carNote.id]));
	});

	it('getEmbeddings: filters by noteIds and silently skips unindexed ids', async () => {
		if (skipIfNoVec()) return;
		const { catNote } = await seed();

		const page = await SearchService.instance().getEmbeddings({
			noteIds: [catNote.id, 'doesnotexist'],
		});

		const noteIds = new Set(page.chunks.map(c => c.noteId));
		expect(noteIds).toEqual(new Set([catNote.id]));
	});

	it('getEmbeddings: paginates with a cursor and signals end-of-stream by omitting nextCursor', async () => {
		if (skipIfNoVec()) return;
		await seed();

		const collected: string[] = [];
		let cursor: string | undefined;
		let pageCount = 0;
		do {
			const page = await SearchService.instance().getEmbeddings({ cursor, limit: 1 });
			pageCount++;
			for (const c of page.chunks) collected.push(`${c.noteId}:${c.chunkIndex}`);
			cursor = page.nextCursor;
			if (pageCount > 50) throw new Error('Pagination did not terminate');
		} while (cursor);

		// Three seeded notes, one chunk each (titles + short bodies fit in a
		// single chunk). With look-ahead, the final page that contains the
		// third chunk must omit nextCursor — so we expect exactly 3 pages,
		// not 4 (which would mean a wasted empty-page round-trip).
		expect(collected).toHaveLength(3);
		expect(new Set(collected).size).toBe(3);
		expect(pageCount).toBe(3);
	});

	it('getEmbeddings: does not emit nextCursor when the page fills exactly to limit', async () => {
		if (skipIfNoVec()) return;
		// Three indexed chunks total; requesting a limit that exactly matches
		// the row count would, without look-ahead, return a cursor pointing at
		// an empty next page.
		await seed();
		const page = await SearchService.instance().getEmbeddings({ limit: 3 });
		expect(page.chunks).toHaveLength(3);
		expect(page.nextCursor).toBeUndefined();
	});

	it('getEmbeddings: rejects a malformed cursor', async () => {
		if (skipIfNoVec()) return;
		await expect(SearchService.instance().getEmbeddings({ cursor: 'garbage' }))
			.rejects.toThrow(/Invalid embeddings cursor/);
	});

	it.each([NaN, Infinity, -1, 0, 1.5])('getEmbeddings: rejects invalid limit %p', async (limit) => {
		await expect(SearchService.instance().getEmbeddings({ limit }))
			.rejects.toThrow(/Invalid embeddings limit/);
	});

	it('getEmbeddings: reads modelId from rows so a mid-flight provider swap cannot mislabel them', async () => {
		if (skipIfNoVec()) return;
		const { catNote } = await seed();
		// Swap the active provider *after* indexing. Rows in the table still
		// carry the original modelId; the page envelope must reflect that, not
		// the live provider.
		AiService.instance().setEmbeddingProvider(new TestEmbeddingProvider({ dimension: 64, modelId: 'different-model' }));

		const page = await SearchService.instance().getEmbeddings({ noteIds: [catNote.id] });
		expect(page.chunks.length).toBeGreaterThan(0);
		expect(page.modelId).toBe('test-model-v1');
	});

	it('uses embedQuery when the provider exposes it', async () => {
		if (skipIfNoVec()) return;
		const { catNote } = await seed();
		// Subclass that records whether embedQuery was reached. Returns the
		// same vector embed() would produce so the search still finds something.
		let embedQueryCalls = 0;
		class SpyProvider extends TestEmbeddingProvider {
			public async embedQuery(texts: string[]) {
				embedQueryCalls++;
				return this.embed(texts);
			}
		}
		const spy = new SpyProvider({ dimension: 64 });
		AiService.instance().setEmbeddingProvider(spy);

		const results = await SearchService.instance().search({
			query: { text: 'cats kittens' },
			relevance: 'loose',
		});

		expect(embedQueryCalls).toBe(1);
		// Sanity-check the search still produced a result.
		expect(results.some(r => r.noteId === catNote.id)).toBe(true);
	});
});
