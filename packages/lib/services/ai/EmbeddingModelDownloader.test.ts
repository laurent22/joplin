import { setupDatabaseAndSynchronizer, switchClient, createTempDir } from '../../testing/test-utils';
import * as fs from 'fs-extra';
import * as tar from 'tar';
import Setting from '../../models/Setting';
import shim from '../../shim';
import {
	ensureModelDownloaded,
	localModelPath,
	removeCachedModel,
	ModelDescriptor,
} from './EmbeddingModelDownloader';

// The downloader test never touches the real network. We build a tiny
// model-shaped tarball on disk and stub shim.fetchBlob to "download" it by
// copying that tarball into the requested destination. Everything past that
// (extract, marker check, cleanup) runs against the real fs.

describe('EmbeddingModelDownloader', () => {

	let tempDir: string;
	let tarballPath: string;
	let originalFetchBlob: typeof shim.fetchBlob;

	const fakeModel: ModelDescriptor = {
		id: 'fake-test-model',
		archiveName: 'fake-test-model',
		downloadUrl: 'https://example.invalid/fake-test-model.tar.gz',
	};

	const buildFakeModelTarball = async (): Promise<string> => {
		// Lay out the staging dir to match the real archive: files at the
		// archive root, no top-level wrapper directory. The downloader
		// extracts into modelDir(model) directly.
		const stagingDir = `${tempDir}/staging`;
		await fs.ensureDir(stagingDir);
		await fs.writeFile(`${stagingDir}/config.json`, '{"_fake":true}');
		await fs.writeFile(`${stagingDir}/tokenizer.json`, '{}');

		const archive = `${tempDir}/${fakeModel.archiveName}.tar.gz`;
		await tar.create({ gzip: true, cwd: stagingDir, file: archive }, ['config.json', 'tokenizer.json']);
		return archive;
	};

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);

		tempDir = await createTempDir();
		// Point cacheDir at our scratch dir so the downloader can't pollute
		// other tests' cache state.
		Setting.setConstant('cacheDir', tempDir);

		tarballPath = await buildFakeModelTarball();

		// Stub fetchBlob: instead of going to the network, copy our local
		// fake tarball to the requested destination.
		originalFetchBlob = shim.fetchBlob;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- fetchBlob's options bag is loosely typed across implementations
		shim.fetchBlob = (async (_url: string, options: any) => {
			await fs.copy(tarballPath, options.path);
			return { ok: true, status: 200, path: options.path };
		});
	});

	afterEach(async () => {
		shim.fetchBlob = originalFetchBlob;
		await fs.remove(tempDir);
	});

	it('returns null from localModelPath when nothing is cached', async () => {
		expect(await localModelPath(fakeModel)).toBeNull();
	});

	it('downloads, extracts, and exposes the model directory', async () => {
		const path = await ensureModelDownloaded(fakeModel);
		expect(path).toMatch(/fake-test-model$/);
		expect(await fs.pathExists(`${path}/config.json`)).toBe(true);
		expect(await fs.pathExists(`${path}/tokenizer.json`)).toBe(true);
		// Tarball cleanup happens after successful extract.
		expect(await fs.pathExists(`${tempDir}/ai/embedding-models/${fakeModel.archiveName}.tar.gz`)).toBe(false);
	});

	it('is idempotent: a second call returns the same path without re-downloading', async () => {
		await ensureModelDownloaded(fakeModel);

		// Count fetchBlob calls in a second run.
		let calls = 0;
		shim.fetchBlob = (async () => {
			calls++;
			return { ok: true, status: 200 };
		});

		const path = await ensureModelDownloaded(fakeModel);
		expect(calls).toBe(0);
		expect(await fs.pathExists(`${path}/config.json`)).toBe(true);
	});

	it('serialises concurrent calls so only one download runs', async () => {
		let calls = 0;
		// Slow the "download" down to widen the race window — without
		// concurrency control, both calls would race to wipe + write the
		// same files at the same time.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- fetchBlob spy mirrors the loose typing of its callers
		shim.fetchBlob = (async (_url: string, options: any) => {
			calls++;
			await new Promise(resolve => setTimeout(resolve, 50));
			await fs.copy(tarballPath, options.path);
			return { ok: true, status: 200 };
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- See above
		}) as any;

		const [p1, p2, p3] = await Promise.all([
			ensureModelDownloaded(fakeModel),
			ensureModelDownloaded(fakeModel),
			ensureModelDownloaded(fakeModel),
		]);

		expect(calls).toBe(1);
		expect(p1).toBe(p2);
		expect(p2).toBe(p3);
		expect(await fs.pathExists(`${p1}/config.json`)).toBe(true);
	});

	it('removes any stale partial state before re-downloading', async () => {
		// Simulate a partial extract left over from a previous crash: directory
		// exists but is missing the marker file.
		const targetDir = `${tempDir}/ai/embedding-models/${fakeModel.archiveName}`;
		await fs.ensureDir(targetDir);
		await fs.writeFile(`${targetDir}/leftover.bin`, 'garbage');
		expect(await localModelPath(fakeModel)).toBeNull();

		const path = await ensureModelDownloaded(fakeModel);
		expect(await fs.pathExists(`${path}/config.json`)).toBe(true);
		// Leftover from the prior failed attempt must be gone.
		expect(await fs.pathExists(`${targetDir}/leftover.bin`)).toBe(false);
	});

	it('throws a clear error when the server returns a non-2xx response', async () => {
		shim.fetchBlob = (async () => ({ ok: false, status: 404 }));
		await expect(ensureModelDownloaded(fakeModel)).rejects.toThrow(/HTTP 404/);
	});

	it('removeCachedModel deletes the extracted directory', async () => {
		await ensureModelDownloaded(fakeModel);
		expect(await localModelPath(fakeModel)).not.toBeNull();

		await removeCachedModel(fakeModel);
		expect(await localModelPath(fakeModel)).toBeNull();
	});

	it('reports progress via the onProgress callback', async () => {
		// Re-stub fetchBlob to actually exercise downloadController so we
		// observe chunk callbacks. We simulate a streaming download by
		// invoking handleChunk a few times before copying the tarball.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- See above
		shim.fetchBlob = (async (_url: string, options: any) => {
			const ctrl = options.downloadController;
			if (ctrl?.handleChunk) {
				const onData = ctrl.handleChunk({ destroy: () => {} });
				onData({ length: 1000 });
				onData({ length: 500 });
			}
			await fs.copy(tarballPath, options.path);
			return { ok: true, status: 200 };
		});

		const samples: { bytesDownloaded: number }[] = [];
		await ensureModelDownloaded(fakeModel, {
			onProgress: (p) => samples.push({ bytesDownloaded: p.bytesDownloaded }),
		});

		expect(samples.length).toBeGreaterThanOrEqual(2);
		expect(samples[samples.length - 1].bytesDownloaded).toBe(1500);
	});
});
