import packToWriter, { FileApi } from './packToWriter';

describe('htmlpack/packToWriter', () => {

	test('should write chunks as they arrive, not buffer them in memory', async () => {
		// packToWriter replaced packToString to pack notes with very large files without
		// loading them fully into memory. This was the OOM bug from issue #13903.
		//
		// The tests in index.test.ts use small files, so they cannot catch this bug.
		// A bad version that keeps all chunks in memory and writes them at the end would
		// still produce the correct output and pass those tests. But it would cause OOM
		// again on a large file.
		//
		// This test checks the real behavior: streamFileDataUri sends chunks one by one,
		// and after each chunk it checks that writeChunk was already called. If the code
		// was keeping all chunks in memory, writeChunk would not run until the end, so
		// this test would fail on the first chunk.

		const writtenChunks: string[] = [];
		let onChunkCalls = 0;

		const fs: FileApi = {
			exists: async () => true,
			readFileText: async () => '',
			readFileDataUri: async () => { throw new Error('readFileDataUri should not be called'); },
			streamFileDataUri: async (_path, onChunk) => {
				for (let i = 0; i < 5; i++) {
					const writesBefore = writtenChunks.length;
					onChunkCalls++;
					await onChunk(`CHUNK_${i}`);
					expect(writtenChunks.length).toBeGreaterThan(writesBefore);
					expect(writtenChunks).toContain(`CHUNK_${i}`);
				}
			},
			writeChunk: (chunk: string) => {
				writtenChunks.push(chunk);
			},
		};

		await packToWriter('/base', '<a href="big.bin">d</a>', fs);

		expect(onChunkCalls).toBe(5);
	});

});
