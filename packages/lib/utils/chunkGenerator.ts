import { read, open, stat } from 'fs';
import { promisify } from 'util';

const readPromisify = promisify(read);
const statPromisify = promisify(stat);
const openPromisify = promisify(open);


async function* generateChunks(
	filePath: string,
	size: number,
// eslint-disable-next-line no-undef
): AsyncGenerator<{ index: number; chunksNo: number; chunk: Buffer }> {
	const sharedBuffer = Buffer.alloc(size);
	let stats;
	let fd;
	let bytesRead = 0;
	let end = size;

	try {
		stats = await statPromisify(filePath);
		fd = await openPromisify(filePath, 'r');
	} catch (error) {
		throw new Error('Failed to open file');
	}

	const chunksNo = Math.ceil(stats.size / size);
	for (let i = 0; i < chunksNo; i++) {
		try {
			// position = null means read from the first and auto increment
			await readPromisify(fd, sharedBuffer, 0, size, i * size);
		} catch (error) {
			throw new Error('Failed to read bytes from file');
		}

		bytesRead = (i + 1) * size;
		if (bytesRead > stats.size) {
			end = size - (bytesRead - stats.size);
		}

		yield {
			index: i,
			chunksNo: chunksNo,
			chunk: sharedBuffer.slice(0, end),
		};
	}
}

export default generateChunks;
