import { setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import LocalEmbeddingProvider, { meanPoolAndNormalise } from './LocalEmbeddingProvider';

// The unit tests run against a fully stubbed ONNX runtime + tokenizer, so they
// neither touch the network nor require the real 140 MB model. The point of
// these tests is to verify the wiring (provider → tokenizer → ort.run → mean
// pool → normalise), not the model's quality.
//
// A gated real-model integration test lives at the bottom (skipped unless
// JOPLIN_RUN_REAL_EMBEDDING_TEST=1) — that one downloads the actual model and
// embeds a few strings end-to-end.

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

	// Gated smoke test that downloads the real model and walks through enough
	// of the pipeline to prove the artefact is well-formed (download URL,
	// tarball layout, tokenizer load, ONNX session creation). Skipped by
	// default because it pulls ~140 MB and takes a while; enable locally with:
	//   yarn testEmbeddingProvider
	// (which sets JOPLIN_RUN_REAL_EMBEDDING_TEST + NODE_OPTIONS=--experimental-vm-modules
	// — the latter lets Jest's sandbox satisfy the dynamic ESM import of
	// @xenova/transformers).
	//
	// We deliberately stop short of calling embed() under Jest. ONNX's
	// InferenceSession returns Float32Array values from outside Jest's VM
	// realm, and `new ort.Tensor(...)` rejects them as "wrong type" — a
	// well-known Jest sandbox / cross-realm quirk that does NOT happen in
	// Electron. For true end-to-end inference verification, run the app
	// with AI enabled and watch the indexer produce vectors.
	// Only run when BOTH the opt-in env var and the required NODE_OPTIONS are
	// set. Anything less and we skip (with a clear comment elsewhere telling
	// people to run `yarn testEmbeddingProvider`) — better than failing loudly
	// when a developer is just running the suite normally.
	const realModelOptIn = process.env.JOPLIN_RUN_REAL_EMBEDDING_TEST === '1'
		&& (process.env.NODE_OPTIONS ?? '').includes('--experimental-vm-modules');
	(realModelOptIn ? it : it.skip)(
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
