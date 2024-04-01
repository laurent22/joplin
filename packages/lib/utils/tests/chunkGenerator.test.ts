import chunkGenerator from '../chunkGenerator';
import { open, readFile, unlink } from 'fs/promises';

// it should exists and be a function

describe('chunkGenerator', () => {
	test('should exists and be a class', () => {
		expect(typeof chunkGenerator).toBe('function');
	});

	test('it should return correct amount of chunks', async () => {
		const file = `${process.cwd()}/utils/tests/empty.pdf`;
		const chunkSize = 4096;

		const numberOfChunks = Math.ceil(11631 / 4096);

		const generator = new chunkGenerator(file, chunkSize);
		await generator.init();

		const { value } = await generator.next();
		expect(value).toBeDefined();
		expect(value.chunksNo).toBe(numberOfChunks);
	});

	test('it should return the original file', async () => {
		const filePath = `${process.cwd()}/utils/tests/empty.pdf`; // size is 11.6 KB
		const reconstructedFilePath = `${process.cwd()}/utils/tests/reconstructed.pdf`;
		const chunkSize = 4096; // 4KB

		const file = await open(reconstructedFilePath, 'a');

		const generator = new chunkGenerator(filePath, chunkSize);
		await generator.init();

		while (true) {
			const { value, done } = await generator.next();
			if (done) {
				break;
			}
			await file.write(value.chunk, null, 'base64');
		}

		await file.close();

		const originalBuffer = await readFile(filePath);
		const reconstructedBuffer = await readFile(reconstructedFilePath);

		await unlink(reconstructedFilePath);
		expect(reconstructedBuffer.equals(originalBuffer)).toBeTruthy();
	});
});
