import { setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import LocalEmbeddingProvider, { meanPoolAndNormalise } from './LocalEmbeddingProvider';

// Default tests use stubbed ONNX + tokenizer (no network, no 140 MB model).
// The bottom test opts in to the real download via JOPLIN_RUN_REAL_EMBEDDING_TEST=1.

interface FakeTokenized {
	input_ids: { data: BigInt64Array; dims: number[] };
	attention_mask: { data: BigInt64Array; dims: number[] };
}

const makeFakeTokenizer = (perTextTokenCount: number) => {
	return (texts: string[]): FakeTokenized => {
		const batch = texts.length;
		const seqLen = perTextTokenCount;
		const ids = new BigInt64Array(batch * seqLen);
		const mask = new BigInt64Array(batch * seqLen);
		for (let b = 0; b < batch; b++) {
			for (let t = 0; t < seqLen; t++) {
				ids[b * seqLen + t] = BigInt(((b + 1) * (t + 1)) % 100);
				mask[b * seqLen + t] = BigInt(1);
			}
		}
		return {
			input_ids: { data: ids, dims: [batch, seqLen] },
			attention_mask: { data: mask, dims: [batch, seqLen] },
		};
	};
};

const HIDDEN = 8;

const makeFakeOnnxRuntime = () => {
	class FakeTensor {
		public data: Float32Array | BigInt64Array;
		public dims: number[];
		public constructor(_type: string, data: Float32Array | BigInt64Array | number[], dims: number[]) {
			this.data = Array.isArray(data) ? new Float32Array(data) : data;
			this.dims = dims;
		}
	}

	const session = {
		run: async (feeds: Record<string, FakeTensor>) => {
			const [batch, seqLen] = feeds.input_ids.dims;
			const out = new Float32Array(batch * seqLen * HIDDEN);
			// Deterministic: each token's hidden vector is a function of the
			// (token value, hidden index) so different inputs produce different
			// pooled outputs and we can assert order-sensitivity.
			const ids = feeds.input_ids.data as BigInt64Array;
			for (let b = 0; b < batch; b++) {
				for (let t = 0; t < seqLen; t++) {
					const idVal = Number(ids[b * seqLen + t]);
					for (let h = 0; h < HIDDEN; h++) {
						out[(b * seqLen + t) * HIDDEN + h] = (idVal + h + 1) / 100;
					}
				}
			}
			return {
				last_hidden_state: {
					data: out,
					dims: [batch, seqLen, HIDDEN],
				},
			};
		},
	};

	return {
		InferenceSession: { create: async () => session },
		Tensor: FakeTensor,
	};
};

const norm = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));

describe('LocalEmbeddingProvider', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('produces unit-norm vectors of the expected shape', async () => {
		const provider = new LocalEmbeddingProvider({
			overrides: {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fakes intentionally loose
				onnxRuntime: makeFakeOnnxRuntime() as any,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fakes intentionally loose
				tokenizer: makeFakeTokenizer(4) as any,
			},
		});

		const vectors = await provider.embed(['hello world', 'goodbye world']);
		expect(vectors).toHaveLength(2);
		expect(vectors[0]).toHaveLength(HIDDEN);
		expect(norm(vectors[0])).toBeCloseTo(1, 5);
		expect(norm(vectors[1])).toBeCloseTo(1, 5);
	});

	it('splits large inputs into mini-batches to cap peak ONNX memory', async () => {
		// Fat notes can produce hundreds of chunks; feeding them all to ONNX in
		// one tensor blows up the renderer on low-free-memory machines
		// (see #15761). The provider must split into ≤ MAX_EMBED_BATCH-sized
		// sub-batches and return the concatenated result in order.
		const runs: number[] = [];
		const onnx = makeFakeOnnxRuntime();
		const realCreate = onnx.InferenceSession.create;
		onnx.InferenceSession.create = async () => {
			const session = await realCreate();
			const realRun = session.run;
			session.run = async (feeds) => {
				runs.push(feeds.input_ids.dims[0]);
				return realRun(feeds);
			};
			return session;
		};

		const provider = new LocalEmbeddingProvider({
			overrides: {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fakes intentionally loose
				onnxRuntime: onnx as any,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fakes intentionally loose
				tokenizer: makeFakeTokenizer(4) as any,
			},
		});

		const inputs = Array.from({ length: 20 }, (_, i) => `t${i}`);
		const vectors = await provider.embed(inputs);

		expect(vectors).toHaveLength(20);
		// 20 inputs / batch 8 → 8, 8, 4
		expect(runs).toEqual([8, 8, 4]);
	});

	it('returns an empty array for empty input without initialising', async () => {
		// No overrides — embed([]) must early-return before any setup runs.
		const provider = new LocalEmbeddingProvider();
		expect(await provider.embed([])).toEqual([]);
	});

	it('exposes the model id and dimension for the indexer', () => {
		const provider = new LocalEmbeddingProvider();
		expect(provider.id).toBe('local');
		expect(provider.classification).toBe('local');
		expect(provider.modelId).toBe('multilingual-e5-small');
		expect(provider.dimension).toBe(384);
	});

	it('mean-pools only over masked-in tokens', () => {
		// 1 batch, 3 tokens, 2 hidden dims. Mask out the middle token.
		const hidden = new Float32Array([
			1, 0, // t0
			9, 9, // t1 (masked out — should be ignored)
			0, 1, // t2
		]);
		const mask = new BigInt64Array([BigInt(1), BigInt(0), BigInt(1)]);
		const out = meanPoolAndNormalise(hidden, [1, 3, 2], mask);
		// Mean of [(1,0), (0,1)] = (0.5, 0.5), normalised = (√2/2, √2/2)
		expect(out[0][0]).toBeCloseTo(Math.SQRT1_2, 5);
		expect(out[0][1]).toBeCloseTo(Math.SQRT1_2, 5);
	});

	it('returns a zero vector (without dividing by zero) when nothing is masked in', () => {
		const hidden = new Float32Array([1, 2, 3, 4]);
		const mask = new BigInt64Array([BigInt(0), BigInt(0)]);
		const out = meanPoolAndNormalise(hidden, [1, 2, 2], mask);
		expect(out[0]).toEqual([0, 0]);
	});

	it('throws when the model produces non-finite values, instead of writing NaN to the index', () => {
		const hidden = new Float32Array([1, NaN, 3, 4]);
		const mask = new BigInt64Array([BigInt(1), BigInt(1)]);
		expect(() => meanPoolAndNormalise(hidden, [1, 2, 2], mask)).toThrow(/non-finite/);
	});

	it('modelDownloadStatus reports not-started when no cached model exists', async () => {
		const provider = new LocalEmbeddingProvider();
		// Without overrides and with a clean cache dir, the marker file is
		// absent — the status should be 'not-started'.
		expect(await provider.modelDownloadStatus()).toBe('not-started');
	});

	// Run via `yarn testEmbeddingProvider` (sets the env var + required
	// NODE_OPTIONS=--experimental-vm-modules). Stops short of running inference:
	// ONNX's output Float32Array crosses Jest's VM realm and `new ort.Tensor(...)`
	// rejects it as wrong-type. This does NOT happen in Electron.
	(process.env.JOPLIN_RUN_REAL_EMBEDDING_TEST === '1' ? it : it.skip)(
		'downloads and loads the real model (gated)',
		async () => {
			const provider = new LocalEmbeddingProvider();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- white-box reach-in to drive initialise() without calling embed()
			await (provider as any).ensureInitialised();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ditto
			expect((provider as any).session_).toBeTruthy();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ditto
			expect((provider as any).tokenizer_).toBeTruthy();
		},
		180_000,
	);
});
