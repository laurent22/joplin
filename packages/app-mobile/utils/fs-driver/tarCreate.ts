import { pack as tarStreamPack } from 'tar-stream';
import { resolve, normalize } from 'path';
import { Buffer } from 'buffer';
import FsDriverBase from '@joplin/lib/fs-driver-base';

import Logger from '@joplin/utils/Logger';
import { chunkSize } from './constants';
import appendBinaryReadableToFile from './utils/appendBinaryReadableToFile';

const logger = Logger.create('tarCreate');

interface TarCreateOptions {
	cwd: string;
	file: string;
}

// TODO: Support globbing directories contained in filePaths
//       like node-tar. (The fs-driver-node implementation of tarCreate).

const tarCreate = async (fsDriver: FsDriverBase, options: TarCreateOptions, filePaths: string[]) => {
	// Choose a default cwd if not given
	const cwd = normalize(options.cwd);
	const outPath = resolve(cwd, options.file);

	if (await fsDriver.exists(outPath)) {
		throw new Error('Error! Destination already exists');
	}

	const pack = tarStreamPack();

	for (const path of filePaths) {
		const absPath = resolve(cwd, path);
		const handle = await fsDriver.open(absPath, 'r');
		const stat = await fsDriver.stat(absPath);
		const sizeBytes: number = stat.size;

		// TODO! Support directories. Clients must currently specify paths to each
		// child.
		if (stat.isDirectory()) {
			continue;
		}

		try {
			// path-browserify's `relative` is broken. Thus, we need to use resolve
			// to determine a relative path: https://github.com/browserify/path-browserify/issues/29
			let relativePath = resolve(cwd, path).substring(cwd.length + 1);

			// pack.entry fails if path includes ".."
			if (relativePath.includes('..')) {
				relativePath = path;
			}

			const entry = pack.entry({ name: relativePath, size: sizeBytes }, (error) => {
				if (error) {
					logger.error(`Tar error: ${error}`);
				}
			});

			// Stream the file into the entry
			let chunk: string|null = null;
			const nextChunk = async () => {
				chunk = await fsDriver.readFileChunk(handle, chunkSize, 'base64');
				return chunk !== null;
			};

			while (await nextChunk()) {
				entry.write(Buffer.from(chunk, 'base64'));
			}

			entry.end();
		} finally {
			await fsDriver.close(handle);
		}
	}

	pack.finalize();

	await appendBinaryReadableToFile(fsDriver, outPath, pack);
};

export default tarCreate;
