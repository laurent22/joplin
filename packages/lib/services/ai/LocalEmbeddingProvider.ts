import Logger from '@joplin/utils/Logger';
import shim from '../../shim';
import { EmbeddingProvider, ProviderModelDownloadStatus, ProviderClassification } from './types';
import {
	MULTILINGUAL_E5_SMALL,
	ModelDescriptor,
	ProgressCallback,
	ensureModelDownloaded,
	localModelPath,
} from './EmbeddingModelDownloader';

const logger = Logger.create('LocalEmbeddingProvider');

// Runs the bundled multilingual-e5-small model locally via onnxruntime-node.
// Tokenization is delegated to @xenova/transformers; inference runs through
// shim.onnxRuntime() so non-desktop builds without ONNX wired in degrade
// cleanly instead of crashing on require().

// Capped to keep background indexing from pegging every core.
const INTRA_OP_NUM_THREADS = 2;

// Cap on how many texts go through a single ONNX run. The peak working set of
// a transformer pass scales with batch_size × seq_len × hidden_dim × layers.
// On a fat note (hundreds of chunks), feeding everything at once produces a
// tensor large enough to crash the renderer on low-free-memory machines
// (#15761). 8 keeps the per-call peak below ~100MB while still amortising the
// session.run() overhead.
const MAX_EMBED_BATCH = 8;

// Fixed at the model's known output size — the sqlite-vec table dimension
// is set on first create() and must match.
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
	// Set while we're inside ensureModelDownloaded() so the status panel can
	// distinguish "downloading" from "not started" without polling disk.
	private downloadStatus_: ProviderModelDownloadStatus | null = null;

	public constructor(options: LocalEmbeddingProviderOptions = {}) {
		this.model_ = options.model ?? MULTILINGUAL_E5_SMALL;
		this.onDownloadProgress_ = options.onDownloadProgress;
		this.overrides_ = options.overrides;
		this.modelId = this.model_.id;
	}

	public async embed(texts: string[]): Promise<number[][]> {
		return this.runEmbed(texts, 'passage: ');
	}

	public async embedQuery(texts: string[]): Promise<number[][]> {
		return this.runEmbed(texts, 'query: ');
	}

	private async runEmbed(texts: string[], prefix: string): Promise<number[][]> {
		if (!texts.length) return [];

		await this.ensureInitialised();

		// e5 is trained with asymmetric prefixes — "passage: " for documents,
		// "query: " for searches. Mixing them up measurably hurts retrieval.
		const prefixed = texts.map(t => `${prefix}${t}`);

		// Split into mini-batches so a note with hundreds of chunks doesn't
		// produce one huge tensor — see MAX_EMBED_BATCH.
		const results: number[][] = [];
		for (let i = 0; i < prefixed.length; i += MAX_EMBED_BATCH) {
			const slice = prefixed.slice(i, i + MAX_EMBED_BATCH);
			const vectors = await this.runEmbedBatch(slice);
			for (const v of vectors) results.push(v);
		}
		return results;
	}

	private async runEmbedBatch(prefixed: string[]): Promise<number[][]> {
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
		// e5's ONNX export declares token_type_ids as a required input even
		// though XLM-RoBERTa is single-segment. transformers.js doesn't emit
		// it, so we synthesise a zero tensor when the session asks for one.
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
		// Drop the cached promise on rejection so a transient failure can be
		// retried — otherwise every future caller inherits the failed promise.
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

		// Test seam: with both overrides supplied, skip the disk + ESM-import
		// paths entirely.
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
		this.downloadStatus_ = 'downloading';
		try {
			const dir = await ensureModelDownloaded(this.model_, { onProgress: this.onDownloadProgress_ });
			this.downloadStatus_ = 'downloaded';
			return dir;
		} catch (error) {
			this.downloadStatus_ = null;
			throw error;
		}
	}

	public async modelDownloadStatus(): Promise<ProviderModelDownloadStatus> {
		// In-flight download wins — the on-disk check still says "not started"
		// while the tarball is being fetched.
		if (this.downloadStatus_ === 'downloading') return 'downloading';
		const dir = await localModelPath(this.model_);
		if (dir) {
			this.downloadStatus_ = 'downloaded';
			return 'downloaded';
		}
		return this.downloadStatus_ ?? 'not-started';
	}

	private getOnnxRuntime(): OnnxRuntime {
		return (this.overrides_?.onnxRuntime ?? shim.onnxRuntime()) as OnnxRuntime;
	}

	private async loadTokenizer(modelDir: string): Promise<Tokenizer> {
		if (this.overrides_?.tokenizer) return this.overrides_.tokenizer;
		// See dynamicEsmImport.js for why this isn't a plain `await import()`.
		// eslint-disable-next-line @typescript-eslint/no-require-imports -- see dynamicEsmImport.js
		const dynamicImport = require('./dynamicEsmImport') as (s: string)=> Promise<{
			env: { localModelPath: string; allowRemoteModels: boolean };
			AutoTokenizer: { from_pretrained: (name: string)=> Promise<Tokenizer> };
		}>;
		const transformers = await dynamicImport('@xenova/transformers');
		// transformers.js resolves model_id against env.localModelPath, so we
		// point it at the parent and pass the model dir name as the id.
		// allowRemoteModels=false stops it falling back to huggingface.co.
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
