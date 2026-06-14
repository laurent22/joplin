import Logger from '@joplin/utils/Logger';
import Setting from '../../models/Setting';
import shim from '../../shim';

const logger = Logger.create('EmbeddingModelDownloader');

// Handles downloading the local embedding model on first use and caching it
// under the user's profile. The model itself is too large to ship with the
// desktop installer (~140 MB), so we download it lazily the first time the
// user enables AI.
//
// Cache layout (under `${cacheDir}/ai/embedding-models/`):
//
//   multilingual-e5-small/
//     config.json
//     model_quantized.onnx
//     sentencepiece.bpe.model
//     special_tokens_map.json
//     tokenizer.json
//     tokenizer_config.json
//
// The model directory is created by extracting the tarball published as a
// release asset in https://github.com/joplinapp/embedding-models. Each release
// uses the model name as both the tag and the archive filename, so the
// download URL is fully determined by the model id.

export interface ModelDescriptor {
	// Stable identifier the indexer stores in note_embeddings_meta.model_id.
	// When this changes, EmbeddingIndexer.handleModelChange() wipes the index.
	id: string;
	// File name (without `.tar.gz`) that matches the GitHub release tag AND
	// the top-level directory inside the archive.
	archiveName: string;
	// Public URL the tarball is downloaded from.
	downloadUrl: string;
}

export const MULTILINGUAL_E5_SMALL: ModelDescriptor = {
	id: 'multilingual-e5-small',
	archiveName: 'multilingual-e5-small',
	downloadUrl: 'https://github.com/joplin/embedding-models/releases/download/1.0.0/multilingual-e5-small.tar.gz',
};

export interface DownloadProgress {
	// Bytes received so far. May be partial if the server doesn't advertise
	// Content-Length (rare with GitHub Releases, but defensive).
	bytesDownloaded: number;
	// Total bytes if known, else null. Use to compute a percentage when set.
	totalBytes: number | null;
}

export type ProgressCallback = (progress: DownloadProgress)=> void;

interface EnsureOptions {
	onProgress?: ProgressCallback;
}

const baseCacheDir = () => `${Setting.value('cacheDir')}/ai/embedding-models`;

const archivePath = (model: ModelDescriptor) =>
	`${baseCacheDir()}/${model.archiveName}.tar.gz`;

const modelDir = (model: ModelDescriptor) =>
	`${baseCacheDir()}/${model.archiveName}`;

// Returns the path to the local model directory if it's present and looks
// usable (the marker file we extract is there). Returns null otherwise.
export const localModelPath = async (model: ModelDescriptor): Promise<string | null> => {
	const dir = modelDir(model);
	// A successful extract always leaves config.json behind. That's our cheap
	// "is the model cached?" check — no need to validate every file.
	const marker = `${dir}/config.json`;
	const exists = await shim.fsDriver().exists(marker);
	return exists ? dir : null;
};

// Tracks in-flight downloads per model so concurrent callers share a single
// download instead of racing on the same tarball + extract directory. Cleared
// once the work either resolves or rejects so a later call after a failure can
// retry from scratch.
const inFlight: Map<string, Promise<string>> = new Map();

// Downloads, verifies, and extracts the model if it isn't already on disk.
// Safe to call repeatedly and from concurrent callers: cache hot → returns
// immediately; cache cold → first caller does the work and the rest await
// the same promise.
export const ensureModelDownloaded = async (
	model: ModelDescriptor,
	options: EnsureOptions = {},
): Promise<string> => {
	const existing = await localModelPath(model);
	if (existing) return existing;

	const pending = inFlight.get(model.id);
	if (pending) return pending;

	// eslint-disable-next-line promise/prefer-await-to-then -- .finally is the natural fit here: we need cleanup to run on both resolve and reject, without inverting the caller-facing await chain
	const work = runDownload(model, options).finally(() => {
		inFlight.delete(model.id);
	});
	inFlight.set(model.id, work);
	return work;
};

const runDownload = async (
	model: ModelDescriptor,
	options: EnsureOptions,
): Promise<string> => {
	const fsDriver = shim.fsDriver();
	const cacheDir = baseCacheDir();
	await fsDriver.mkdir(cacheDir);

	const tarPath = archivePath(model);
	const targetDir = modelDir(model);

	// Wipe any stale half-downloaded tarball or partially-extracted directory
	// left over from a previous failed attempt.
	if (await fsDriver.exists(tarPath)) await fsDriver.remove(tarPath);
	if (await fsDriver.exists(targetDir)) await fsDriver.remove(targetDir);

	logger.info(`Downloading embedding model from ${model.downloadUrl}`);
	await downloadWithProgress(model.downloadUrl, tarPath, options.onProgress);

	// The published tarball stores files at the archive root (no top-level
	// directory) so we have to create the target dir ourselves and extract
	// into it. If we extracted into cacheDir the model files would spill into
	// the cache root and clobber any sibling model.
	logger.info(`Extracting embedding model into ${targetDir}`);
	await fsDriver.mkdir(targetDir);
	await fsDriver.tarExtract({ file: tarPath, cwd: targetDir });

	// Sanity check: after extraction the archive directory should exist with
	// the marker file in place. If not, the tarball was malformed.
	const verified = await localModelPath(model);
	if (!verified) {
		throw new Error(`Embedding model archive did not extract as expected (missing ${targetDir}/config.json)`);
	}

	// Tarball is no longer needed once extracted.
	try {
		await fsDriver.remove(tarPath);
	} catch (error) {
		// Non-fatal — the next download attempt will clean it up.
		logger.warn(`Failed to delete model archive at ${tarPath}: ${error.message ?? error}`);
	}

	return verified;
};

const downloadWithProgress = async (
	url: string,
	destPath: string,
	onProgress?: ProgressCallback,
): Promise<void> => {
	// shim.fetchBlob streams the body straight to disk and handles redirects
	// (GitHub Releases redirects to S3, so following redirects is mandatory).
	// We pass a minimal downloadController so the underlying node http code
	// hands us each chunk as it arrives — that's our progress signal.
	//
	// The timeout is per-socket-idle (not total), so a 60s value means "fail
	// after 60s of silence" — fine for a multi-minute download as long as
	// data keeps flowing. Without it, shim.fetchBlob defaults to no timeout
	// and a stalled connection (captive portal, dropped TCP traffic, hung
	// proxy) would block forever and freeze every concurrent caller waiting
	// on the shared in-flight promise.
	const downloadController = onProgress ? makeProgressController(onProgress) : undefined;
	const response = await shim.fetchBlob(url, {
		path: destPath,
		method: 'GET',
		downloadController,
		timeout: 60_000,
	});

	if (!response || response.ok === false) {
		const status = response?.status ?? 'unknown';
		throw new Error(`Failed to download embedding model: HTTP ${status}`);
	}
};

// Minimal downloadController shape that conforms to the contract exercised by
// shim-init-node's fetchBlob (only `handleChunk(request)` is called). We don't
// care about the size-limit fields the real LimitedDownloadController uses —
// they're set internally by callers that need them.
const makeProgressController = (onProgress: ProgressCallback) => {
	let bytesDownloaded = 0;
	const totalBytes: number | null = null;
	return {
		totalBytes: 0,
		imagesCount: 0,
		imageCountExpected: 0,
		maxImagesCount: 0,
		printStats: () => { /* no-op */ },
		limitMessage: () => '',
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- DownloadChunk type isn't re-exported; we read only .length
		handleChunk: (_request: unknown) => (chunk: any) => {
			bytesDownloaded += chunk.length ?? 0;
			onProgress({ bytesDownloaded, totalBytes });
		},
	};
};

// Clears the cached model. Used for the future "re-download" path and to
// reclaim disk space when AI is disabled and the user wants a clean slate.
export const removeCachedModel = async (model: ModelDescriptor): Promise<void> => {
	const fsDriver = shim.fsDriver();
	const dir = modelDir(model);
	const tar = archivePath(model);
	if (await fsDriver.exists(dir)) await fsDriver.remove(dir);
	if (await fsDriver.exists(tar)) await fsDriver.remove(tar);
};
