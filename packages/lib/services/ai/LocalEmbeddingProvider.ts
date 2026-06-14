import Logger from '@joplin/utils/Logger';
import shim from '../../shim';
import { EmbeddingProvider, ProviderClassification } from './types';
import {
	MULTILINGUAL_E5_SMALL,
	ModelDescriptor,
	ProgressCallback,
	ensureModelDownloaded,
} from './EmbeddingModelDownloader';

const logger = Logger.create('LocalEmbeddingProvider');

// Runs the bundled multilingual-e5-small model locally via onnxruntime-node.
// Tokenization is delegated to @xenova/transformers (AutoTokenizer); inference
// runs through shim.onnxRuntime() so non-desktop builds (mobile, cli) that
// haven't wired ONNX in degrade cleanly instead of crashing on require().
//
// e5 models expect inputs prefixed with "passage: " (for documents being
// indexed) or "query: " (for search queries). For v1 we always use "passage:"
// because this provider only feeds the indexer. When PR D adds search,
// callers will provide pre-prefixed text or we'll add an `embedQuery()`
// method — whichever fits the API best.

// Cap ONNX thread count so background indexing doesn't peg every core on the
// user's machine. 2 threads is a good compromise: noticeably faster than 1
// without making the laptop fans spin during a re-index.
const INTRA_OP_NUM_THREADS = 2;

// e5-small returns 384-dim vectors. Hard-coded because the sqlite-vec table
// dimension is fixed at first creation and we need to match it. If we ever
// switch model, modelId changes too and the indexer rebuilds from scratch
// against the new dimension.
const E5_SMALL_DIMENSION = 384;

interface OnnxSession {
	run(feeds: Record<string, OnnxTensor>): Promise<Record<string, OnnxTensor>>;
	inputNames?: string[];
}

interface OnnxTensor {
	data: Float32Array | BigInt64Array;
	dims: number[];
}

interface OnnxRuntime {
	InferenceSession: {
		create(modelPath: string, options?: unknown): Promise<OnnxSession>;
	};
	Tensor: new (type: string, data: Float32Array | BigInt64Array | number[], dims: number[])=> OnnxTensor;
}

interface Tokenizer {
	(texts: string[], options?: { padding?: boolean; truncation?: boolean; max_length?: number }): {
		input_ids: { data: BigInt64Array; dims: number[] };
		attention_mask: { data: BigInt64Array; dims: number[] };
		token_type_ids?: { data: BigInt64Array; dims: number[] };
	};
}

export interface LocalEmbeddingProviderOptions {
	model?: ModelDescriptor;
	onDownloadProgress?: ProgressCallback;
	// Test-only seam: lets unit tests inject a fake ONNX runtime + tokenizer
	// without needing to download a real model. When both are set, the
	// download + transformers.js code paths are skipped entirely.
	overrides?: {
		onnxRuntime?: OnnxRuntime;
		tokenizer?: Tokenizer;
	};
}

export default class LocalEmbeddingProvider implements EmbeddingProvider {

	public readonly id = 'local';
	public readonly classification: ProviderClassification = 'local';
	public readonly modelId: string;
	public readonly dimension: number = E5_SMALL_DIMENSION;

	private model_: ModelDescriptor;
	private onDownloadProgress_?: ProgressCallback;
	private overrides_: LocalEmbeddingProviderOptions['overrides'];
	private initPromise_: Promise<void> | null = null;
	private session_: OnnxSession | null = null;
	private tokenizer_: Tokenizer | null = null;

	public constructor(options: LocalEmbeddingProviderOptions = {}) {
		this.model_ = options.model ?? MULTILINGUAL_E5_SMALL;
		this.onDownloadProgress_ = options.onDownloadProgress;
		this.overrides_ = options.overrides;
		this.modelId = this.model_.id;
	}

	public async embed(texts: string[]): Promise<number[][]> {
		if (!texts.length) return [];

		await this.ensureInitialised();

		// e5 indexing prefix. Without this, retrieval quality drops noticeably
		// (it's part of the model's training contract).
		const prefixed = texts.map(t => `passage: ${t}`);

		const tokenized = this.tokenizer_!(prefixed, {
			padding: true,
			truncation: true,
			max_length: 512,
		});

		const ort = this.getOnnxRuntime();
		const inputIds = new ort.Tensor('int64', tokenized.input_ids.data, tokenized.input_ids.dims);
		const attentionMask = new ort.Tensor('int64', tokenized.attention_mask.data, tokenized.attention_mask.dims);

		const feeds: Record<string, OnnxTensor> = {
			input_ids: inputIds,
			attention_mask: attentionMask,
		};
		// e5 was exported expecting token_type_ids as an input even though
		// XLM-RoBERTa only ever uses a single segment. transformers.js
		// doesn't emit it for XLM-R, so we synthesise a zero tensor with the
		// same shape — that's what the model would see for any single-segment
		// input anyway.
		if (this.session_!.inputNames?.includes('token_type_ids')) {
			const ttiData = tokenized.token_type_ids?.data
				?? new BigInt64Array(tokenized.input_ids.data.length);
			feeds.token_type_ids = new ort.Tensor('int64', ttiData, tokenized.input_ids.dims);
		}

		const output = await this.session_!.run(feeds);
		const lastHidden = output.last_hidden_state ?? output.token_embeddings ?? Object.values(output)[0];

		return meanPoolAndNormalise(
			lastHidden.data as Float32Array,
			lastHidden.dims,
			tokenized.attention_mask.data,
		);
	}

	private async ensureInitialised(): Promise<void> {
		if (this.session_ && this.tokenizer_) return;
		// Clear initPromise_ on rejection so a transient failure (e.g. a
		// dropped download) can be retried on the next call instead of every
		// future call inheriting the same rejected promise.
		// eslint-disable-next-line promise/prefer-await-to-then -- await would need a wrapper to keep the single-flight cache shape
		this.initPromise_ ??= this.initialise().catch(error => {
			this.initPromise_ = null;
			throw error;
		});
		return this.initPromise_;
	}

	private async initialise(): Promise<void> {
		const ort = this.getOnnxRuntime();
		if (!ort) {
			throw new Error('ONNX runtime is not available. Local embeddings require the desktop build.');
		}

		// Full-override path used by unit tests: skip disk + transformers.js
		// entirely so the test runner doesn't need a real model directory.
		if (this.overrides_?.onnxRuntime && this.overrides_?.tokenizer) {
			this.session_ = await ort.InferenceSession.create('', {});
			this.tokenizer_ = this.overrides_.tokenizer;
			return;
		}

		const modelDir = await this.resolveModelDir();
		logger.info(`Loading embedding model from ${modelDir}`);

		const sessionOptions = {
			executionProviders: ['cpu'],
			intraOpNumThreads: INTRA_OP_NUM_THREADS,
			graphOptimizationLevel: 'all',
		};

		this.session_ = await ort.InferenceSession.create(`${modelDir}/model_quantized.onnx`, sessionOptions);
		this.tokenizer_ = await this.loadTokenizer(modelDir);
	}

	private async resolveModelDir(): Promise<string> {
		return ensureModelDownloaded(this.model_, { onProgress: this.onDownloadProgress_ });
	}

	private getOnnxRuntime(): OnnxRuntime {
		return (this.overrides_?.onnxRuntime ?? shim.onnxRuntime()) as OnnxRuntime;
	}

	private async loadTokenizer(modelDir: string): Promise<Tokenizer> {
		if (this.overrides_?.tokenizer) return this.overrides_.tokenizer;
		// transformers.js is an ESM-only package, so we can't `require()` it
		// from this CommonJS module. A plain `await import()` is what we want
		// but TypeScript rewrites it to `require()` under `module: commonjs`.
		// `new Function('import(...)')` would also work but the renderer's CSP
		// forbids unsafe-eval. So we hide the dynamic import in a sibling .js
		// file that TypeScript can't see (and so can't rewrite).
		// eslint-disable-next-line @typescript-eslint/no-require-imports -- the .js helper preserves a native ESM import past TS lowering
		const dynamicImport = require('./dynamicEsmImport') as (s: string)=> Promise<{
			env: { localModelPath: string; allowRemoteModels: boolean };
			AutoTokenizer: { from_pretrained: (name: string)=> Promise<Tokenizer> };
		}>;
		const transformers = await dynamicImport('@xenova/transformers');
		// Point transformers.js at the parent dir of the extracted model
		// (so model_id `multilingual-e5-small` resolves to `${modelDir}`),
		// and disable network fetches so we never silently hit huggingface.co.
		transformers.env.localModelPath = `${modelDir}/..`;
		transformers.env.allowRemoteModels = false;
		const tokenizer = await transformers.AutoTokenizer.from_pretrained(this.model_.archiveName);
		return tokenizer as Tokenizer;
	}
}

// Mean-pools token embeddings over the attention mask, then L2-normalises.
// Returns one vector per row. Public for test reach-in.
export const meanPoolAndNormalise = (
	hiddenStates: Float32Array,
	dims: number[],
	attentionMask: BigInt64Array,
): number[][] => {
	const [batch, seqLen, hidden] = dims;
	const out: number[][] = [];

	for (let b = 0; b < batch; b++) {
		const vec = new Array<number>(hidden).fill(0);
		let count = 0;
		for (let t = 0; t < seqLen; t++) {
			if (attentionMask[b * seqLen + t] === BigInt(0)) continue;
			count++;
			const base = (b * seqLen + t) * hidden;
			for (let h = 0; h < hidden; h++) {
				vec[h] += hiddenStates[base + h];
			}
		}
		if (count > 0) {
			for (let h = 0; h < hidden; h++) vec[h] /= count;
		}
		let norm = 0;
		for (let h = 0; h < hidden; h++) norm += vec[h] * vec[h];
		norm = Math.sqrt(norm);
		if (norm > 0) {
			for (let h = 0; h < hidden; h++) vec[h] /= norm;
		}
		out.push(vec);
	}

	return out;
};
