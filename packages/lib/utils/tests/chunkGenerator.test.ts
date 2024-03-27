import chunkGenerator from '../chunkGenerator';
import * as fs from 'fs';

// it should exists and be a function

describe('chunkGenerator', () => {
	afterAll(() => {
		fs.unlink('./reconstructed.pdf', () => {});
	});
	test('should exists and be a function', () => {
		expect(typeof chunkGenerator).toBe('function');
	});

	test('it should return correct amount of chunks', async () => {
		const file = `${process.cwd()}/utils/tests/empty.pdf`;
		const chunkSize = 4096;

		const numberOfChunks = Math.ceil(11631 / 4096);

		const generator = chunkGenerator(file, chunkSize).next();
		const { value } = await generator;
		expect(value).toBeDefined();
		expect(value.chunksNo).toBe(numberOfChunks);
	});

	test('it should return the original file', async () => {
		const file = `${process.cwd()}/utils/tests/empty.pdf`; // size is 11.6 KB
		const chunkSize = 4096; // 4KB

		const fd = fs.openSync('./reconstructed.pdf', 'w');

		for await (const { chunk } of chunkGenerator(file, chunkSize)) {
			fs.writeSync(fd, chunk, 0, chunk.length, null);
		}

		fs.closeSync(fd);

		const originalBuffer = await fs.promises.readFile(file);
		const reconstructedBuffer = await fs.promises.readFile(
			`${process.cwd()}/reconstructed.pdf`,
		);

		expect(reconstructedBuffer.equals(originalBuffer)).toBeTruthy();
	});
});
