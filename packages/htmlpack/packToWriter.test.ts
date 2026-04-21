import packToWriter, { FileApi } from './packToWriter';

describe('htmlpack/packToWriter', () => {

	test('should forward each streamed chunk to writeChunk before asking the source for the next one', async () => {
		// This test checks real streaming behavior.
		// After each onChunk call, writeChunk must be called immediately.
		// If data was buffered in memory, writeChunk would not run until the end,
		// so this test would fail.

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
