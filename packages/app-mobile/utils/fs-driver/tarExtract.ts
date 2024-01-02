import { extract as tarStreamExtract } from 'tar-stream';
import { resolve, join, normalize, dirname } from 'path';
import FsDriverBase from '@joplin/lib/fs-driver-base';

import { chunkSize } from './constants';

interface TarExtractOptions {
	cwd: string;
	file: string;
}

// TODO: Might not work (and `relative` is broken in path-browserify)
const isSubdirectoryOrSame = (parent: string, possibleChild: string) => {
	possibleChild = normalize(possibleChild);
	parent = normalize(parent);

	return possibleChild.startsWith(parent);
};

const tarExtract = async (fsDriver: FsDriverBase, options: TarExtractOptions) => {
	const cwd = options.cwd;
	const filePath = resolve(cwd, options.file);


	if (!(await fsDriver.exists(filePath))) {
		throw new Error('Source does not exist');
	}

	const extract = tarStreamExtract({ defaultEncoding: 'base64' });

	extract.on('entry', async (header, stream, next) => {
		const outPath = join(cwd, normalize(header.name));

		// Double-check that outPath is contained within cwd
		// (normalize _should_ expand ..s, so this should be the case).
		if (!isSubdirectoryOrSame(cwd, outPath)) {
			throw new Error(`Extracting the archive would write to ${outPath} which is outside the cwd`);
		}

		if (await fsDriver.exists(outPath)) {
			throw new Error(`Extracting ${outPath} would overwrite`);
		}

		// Move to the next item when all available data has been read.
		stream.once('end', () => next());

		if (header.type === 'directory') {
			await fsDriver.mkdir(outPath);
		} else if (header.type === 'file') {
			const parentDir = dirname(outPath);

			// Create the parent directory if necessary
			if (isSubdirectoryOrSame(cwd, parentDir)) {
				await fsDriver.mkdir(parentDir);
			}

			await fsDriver.appendBinaryReadableToFile(outPath, stream);
		} else {
			throw new Error(`Unsupported file system entity type: ${header.type}`);
		}

		// Drain the rest of the stream.
		stream.resume();

	});

	let finished = false;
	const finishPromise = new Promise<void>((resolve, reject) => {
		extract.once('finish', () => {
			finished = true;
			resolve();
		});

		extract.once('error', (error) => {
			reject(error);
		});
	});

	const fileHandle = await fsDriver.open(filePath, 'r');
	const readChunk = async () => {
		const base64 = await fsDriver.readFileChunk(fileHandle, chunkSize, 'base64');
		return base64 && Buffer.from(base64, 'base64');
	};

	try {
		let chunk = await readChunk();
		let nextChunk = await readChunk();
		do {
			extract.write(chunk);

			chunk = nextChunk;
			nextChunk = await readChunk();
		} while (nextChunk !== null && !finished);

		if (chunk !== null) {
			extract.end(chunk);
		} else {
			extract.end();
		}
	} finally {
		await fsDriver.close(fileHandle);
	}

	await finishPromise;
};

export default tarExtract;
