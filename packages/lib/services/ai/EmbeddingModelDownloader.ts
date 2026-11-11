import Logger from '@joplin/utils/Logger';
import Setting from '../../models/Setting';
import shim from '../../shim';

const logger = Logger.create('EmbeddingModelDownloader');

// Downloads the local embedding model on first use and caches it under
// ${cacheDir}/ai/embedding-models/<archiveName>/. The model is too large
// (~140 MB) to ship with the installer.

export interface ModelDescriptor {
	// Stored alongside each chunk; changing it triggers a full re-index.
	id: string;
	// Base name of the tarball and the cache subdir.
	archiveName: string;
	downloadUrl: string;
}

export const MULTILINGUAL_E5_SMALL: ModelDescriptor = {
	id: 'multilingual-e5-small',
	archiveName: 'multilingual-e5-small',
	downloadUrl: 'https://github.com/joplin/embedding-models/releases/download/1.0.0/multilingual-e5-small.tar.gz',
};

export interface DownloadProgress {
	bytesDownloaded: number;
	// Currently always null — shim.fetchBlob doesn't surface Content-Length.
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

// Returns the model dir if config.json (our extraction marker) is present.
export const localModelPath = async (model: ModelDescriptor): Promise<string | null> => {
	const dir = modelDir(model);
	const marker = `${dir}/config.json`;
	const exists = await shim.fsDriver().exists(marker);
	return exists ? dir : null;
};

// Single-flight per model id so concurrent callers share one download.
const inFlight: Map<string, Promise<string>> = new Map();

export const ensureModelDownloaded = async (
	model: ModelDescriptor,
	options: EnsureOptions = {},
): Promise<string> => {
	const existing = await localModelPath(model);
	if (existing) return existing;

	const pending = inFlight.get(model.id);
	if (pending) return pending;

	// eslint-disable-next-line promise/prefer-await-to-then -- .finally cleans up on both resolve and reject without inverting the caller's await chain
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

	// Wipe any stale partial state from a previous failed attempt.
	if (await fsDriver.exists(tarPath)) await fsDriver.remove(tarPath);
	if (await fsDriver.exists(targetDir)) await fsDriver.remove(targetDir);

	logger.info(`Downloading embedding model from ${model.downloadUrl}`);
	await downloadWithProgress(model.downloadUrl, tarPath, options.onProgress);

	// Files in the tarball sit at the archive root (no wrapping dir), so we
	// create the target ourselves to avoid spilling into the cache root.
	logger.info(`Extracting embedding model into ${targetDir}`);
	await fsDriver.mkdir(targetDir);
	await fsDriver.tarExtract({ file: tarPath, cwd: targetDir });

	const verified = await localModelPath(model);
	if (!verified) {
		throw new Error(`Embedding model archive did not extract as expected (missing ${targetDir}/config.json)`);
	}

	try {
		await fsDriver.remove(tarPath);
	} catch (error) {
		// Non-fatal — next download attempt will clean it up.
		logger.warn(`Failed to delete model archive at ${tarPath}: ${error.message ?? error}`);
	}

	return verified;
};

const downloadWithProgress = async (
	url: string,
	destPath: string,
	onProgress?: ProgressCallback,
): Promise<void> => {
	// 60s is per-socket-idle, not total — fail after silence, fine while
	// data keeps flowing. Without it a stalled connection would block every
	// concurrent caller forever via the shared in-flight promise.
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

// Minimal shape that matches what shim-init-node's fetchBlob actually calls
// on a downloadController — only handleChunk is exercised here.
const makeProgressController = (onProgress: ProgressCallback) => {
	let bytesDownloaded = 0;
	return {
		totalBytes: 0,
		imagesCount: 0,
		imageCountExpected: 0,
		maxImagesCount: 0,
		printStats: () => { /* no-op */ },
		limitMessage: () => '',
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- DownloadChunk type isn't re-exported; we only read .length
		handleChunk: (_request: unknown) => (chunk: any) => {
			bytesDownloaded += chunk.length ?? 0;
			onProgress({ bytesDownloaded, totalBytes: null });
		},
	};
};

// Wipes the cached model. Public for use by a future "re-download" action;
// also covered by tests as the cleanup primitive.
export const removeCachedModel = async (model: ModelDescriptor): Promise<void> => {
	const fsDriver = shim.fsDriver();
	const dir = modelDir(model);
	const tar = archivePath(model);
	if (await fsDriver.exists(dir)) await fsDriver.remove(dir);
	if (await fsDriver.exists(tar)) await fsDriver.remove(tar);
};
