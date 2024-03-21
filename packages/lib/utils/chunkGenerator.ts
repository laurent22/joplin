import * as fs from 'fs';

function readBytes(fd: number, sharedBuffer: Buffer) {
	return new Promise<void>((resolve, reject) => {
		fs.read(fd, sharedBuffer, 0, sharedBuffer.length, null, (error) => {
			if (error) {
				return reject(error);
			}
			resolve();
		});
	});
}

async function* generateChunks(
	filePath: string,
	size: number,
): AsyncGenerator<{ index: number; chunksNo: number; chunk: Buffer }> {
	const sharedBuffer = Buffer.alloc(size);
	let stats;
	let fd;
	let bytesRead = 0;
	let end = size;

	try {
		stats = fs.statSync(filePath);
		fd = fs.openSync(filePath, 'r');
	} catch (_) {
		throw new Error('Failed to open file');
	}

	const chunksNo = Math.ceil(stats.size / size);
	for (let i = 0; i < chunksNo; i++) {
		try {
			await readBytes(fd, sharedBuffer);
		} catch (_) {
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
