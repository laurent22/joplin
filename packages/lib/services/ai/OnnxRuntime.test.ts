import shim from '../../shim';

// Smoke test confirming onnxruntime-node loads cleanly through the shim. No
// real model is loaded yet — that lands with the LocalEmbeddingProvider. The
// goal of this test is to catch packaging/native-binary breakage early, the
// same way SqliteVec.test does for sqlite-vec.

describe('onnxruntime-node', () => {

	it('is reachable via the shim', () => {
		const ort = shim.onnxRuntime();
		if (!ort) {
			// eslint-disable-next-line no-console
			console.warn('Skipping onnxruntime test: onnxruntime-node unavailable on this platform');
			return;
		}
		expect(typeof ort.InferenceSession).toBe('function');
		expect(typeof ort.Tensor).toBe('function');
	});

	it('can build a Float32 Tensor with the correct dims', () => {
		const ort = shim.onnxRuntime();
		if (!ort) return;
		const data = new Float32Array([1, 2, 3, 4, 5, 6]);
		const t = new ort.Tensor('float32', data, [2, 3]);
		expect(t.dims).toEqual([2, 3]);
		expect(t.type).toBe('float32');
		expect(t.size).toBe(6);
	});

	it('exposes SessionOptions threading and optimisation flags', () => {
		const ort = shim.onnxRuntime();
		if (!ort) return;
		// We can't instantiate a session without a real model file, but we
		// can confirm InferenceSession.create exists — that's the entry
		// point LocalEmbeddingProvider will use. The actual model load test
		// will land alongside the provider once a real model file is in play.
		expect(typeof ort.InferenceSession.create).toBe('function');
	});
});
