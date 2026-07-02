import { EmbeddingProvider, ProviderClassification } from '../types';

// Deterministic embedding provider used in CI tests for the indexer and the
// search layer. Same text always produces the same vector, and texts that share
// characters produce more-similar vectors than texts that don't — so
// similaritySearch() returns sensible orderings.
//
// This is NOT a real embedding model. It can't capture semantics that span
// multiple words or handle synonyms. It exists purely so we can exercise the
// indexing + search pipeline end-to-end in CI without bundling onnxruntime-node
// or a 100MB model file.

const DEFAULT_DIMENSION = 32;

const hashString = (s: string): number => {
	// Simple FNV-1a 32-bit hash, used to map each character bigram to a vector
	// index. Deterministic and fast.
	let h = 0x811c9dc5;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
};

const l2Norm = (v: number[]): number => {
	let sum = 0;
	for (const x of v) sum += x * x;
	return Math.sqrt(sum);
};

const normalise = (v: number[]): number[] => {
	const norm = l2Norm(v);
	if (norm === 0) return v;
	return v.map(x => x / norm);
};

const embedOne = (text: string, dimension: number): number[] => {
	const vec = new Array<number>(dimension).fill(0);
	const lower = text.toLowerCase();
	// Character bigrams give a richer signal than unigrams (which would
	// collapse "cat" and "act" together) without exploding the keyspace.
	for (let i = 0; i < lower.length - 1; i++) {
		const bigram = lower.slice(i, i + 2);
		const bucket = hashString(bigram) % dimension;
		vec[bucket] += 1;
	}
	// Always include a constant signal so empty or one-character strings
	// still produce a non-zero vector (otherwise normalise() returns zeros
	// and similarity is undefined).
	vec[0] += 1;
	return normalise(vec);
};

export interface TestEmbeddingProviderOptions {
	id?: string;
	modelId?: string;
	dimension?: number;
}

export default class TestEmbeddingProvider implements EmbeddingProvider {

	public id: string;
	public modelId: string;
	public dimension: number;
	public classification: ProviderClassification = 'local';

	public constructor(options: TestEmbeddingProviderOptions = {}) {
		this.id = options.id ?? 'test';
		this.modelId = options.modelId ?? 'test-model-v1';
		this.dimension = options.dimension ?? DEFAULT_DIMENSION;
	}

	public async embed(texts: string[]): Promise<number[][]> {
		return texts.map(t => embedOne(t, this.dimension));
	}
}
