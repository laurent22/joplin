import { setupDatabaseAndSynchronizer, switchClient, db } from '../../testing/test-utils';

// Verifies the sqlite-vec extension is loaded and behaves correctly. Uses
// hand-crafted unit vectors so we can assert exact KNN ordering without depending
// on a real embedding model.

describe('SqliteVec', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('loads the extension and reports availability', () => {
		// If this fails the rest of the suite is meaningless — sqlite-vec wasn't
		// loaded by jest.setup.js for this platform.
		expect(db(1).sqliteVecAvailable()).toBe(true);
	});

	it('exposes the vec_version() function', async () => {
		const row = await db(1).selectOne('SELECT vec_version() AS v');
		expect(typeof row.v).toBe('string');
		expect(row.v.length).toBeGreaterThan(0);
	});

	it('supports KNN queries against a vec0 virtual table', async () => {
		// Three 4D unit vectors pointing along distinct axes. The query vector is
		// nearly aligned with the first one, so KNN should return them in this
		// exact order. We pass vectors as JSON strings — sqlite-vec accepts that
		// form alongside raw bytes, and it sidesteps node-sqlite3's blob handling.
		const dim = 4;
		await db(1).exec(`CREATE VIRTUAL TABLE test_vecs USING vec0(embedding FLOAT[${dim}])`);

		const vectors: [number, number[]][] = [
			[1, [1, 0, 0, 0]],
			[2, [0, 1, 0, 0]],
			[3, [0, 0, 1, 0]],
		];
		for (const [id, vec] of vectors) {
			await db(1).exec({
				sql: 'INSERT INTO test_vecs(rowid, embedding) VALUES (?, ?)',
				params: [id, JSON.stringify(vec)],
			});
		}

		const queryVector = JSON.stringify([0.9, 0.1, 0, 0]);
		const rows = await db(1).selectAll<{ rowid: number; distance: number }>(
			'SELECT rowid, distance FROM test_vecs WHERE embedding MATCH ? ORDER BY distance LIMIT 3',
			[queryVector],
		);

		expect(rows.length).toBe(3);
		expect(rows[0].rowid).toBe(1);
		expect(rows[1].rowid).toBe(2);
		expect(rows[2].rowid).toBe(3);
		// First result must be strictly closer than the others.
		expect(rows[0].distance).toBeLessThan(rows[1].distance);
		expect(rows[1].distance).toBeLessThan(rows[2].distance);
	});
});
