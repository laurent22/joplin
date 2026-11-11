import TestEmbeddingProvider from './TestEmbeddingProvider';

// Sanity tests for the test stub. Not exhaustive — the goal is just to
// confirm the properties the indexer/search integration tests depend on:
// determinism, similarity for related text, distance for unrelated text.

const dot = (a: number[], b: number[]): number => {
	let sum = 0;
	for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
	return sum;
};

describe('TestEmbeddingProvider', () => {

	it('produces vectors of the configured dimension', async () => {
		const provider = new TestEmbeddingProvider({ dimension: 16 });
		const [v] = await provider.embed(['hello world']);
		expect(v.length).toBe(16);
	});

	it('is deterministic: same input always produces the same vector', async () => {
		const provider = new TestEmbeddingProvider();
		const [v1] = await provider.embed(['the quick brown fox']);
		const [v2] = await provider.embed(['the quick brown fox']);
		expect(v1).toEqual(v2);
	});

	it('returns unit-length vectors (cosine similarity == dot product)', async () => {
		const provider = new TestEmbeddingProvider();
		const [v] = await provider.embed(['anything reasonable']);
		const norm = Math.sqrt(dot(v, v));
		expect(norm).toBeCloseTo(1, 5);
	});

	it('scores related text more similarly than unrelated text', async () => {
		const provider = new TestEmbeddingProvider();
		const [vQuery, vRelated, vUnrelated] = await provider.embed([
			'cats and kittens',
			'kittens like cats',
			'engine repair manual',
		]);

		const relatedSim = dot(vQuery, vRelated);
		const unrelatedSim = dot(vQuery, vUnrelated);
		expect(relatedSim).toBeGreaterThan(unrelatedSim);
	});

	it('handles empty and single-character inputs without producing zero vectors', async () => {
		const provider = new TestEmbeddingProvider();
		const [vEmpty, vSingle] = await provider.embed(['', 'a']);
		expect(Math.sqrt(dot(vEmpty, vEmpty))).toBeCloseTo(1, 5);
		expect(Math.sqrt(dot(vSingle, vSingle))).toBeCloseTo(1, 5);
	});
});
