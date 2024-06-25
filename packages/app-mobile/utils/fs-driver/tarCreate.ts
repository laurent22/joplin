import { pack as tarStreamPack } from 'tar-stream';
import { resolve } from 'path';
import { Buffer } from 'buffer';

import Logger from '@joplin/utils/Logger';
import { chunkSize } from './constants';
import shim from '@joplin/lib/shim';

const logger = Logger.create('fs-driver-rn');

export interface TarCreateOptions {
	cwd: string;
	file: string;
}

// TODO: Support glob patterns, which are currently supported by the
//       node fsDriver.

const tarCreate = async (options: TarCreateOptions, filePaths: string[]) => {
	// Choose a default cwd if not given
	const cwd = options.cwd ?? shim.fsDriver().getAppDirectoryPath();
	const file = resolve(cwd, options.file);

	const fsDriver = shim.fsDriver();
	if (await fsDriver.exists(file)) {
		throw new Error('Error! Destination already exists');
	}

	const pack = tarStreamPack();

	const errors: Error[] = [];
	pack.addListener('error', error => {
		logger.error(`Tar error: ${error}`);
		errors.push(error);
	});

	for (const path of filePaths) {
		const absPath = resolve(cwd, path);
		const stat = await fsDriver.stat(absPath);
		const sizeBytes: number = stat.size;

		const entry = pack.entry({ name: path, size: sizeBytes }, (error) => {
			if (error) {
				logger.error(`Tar error: ${error}`);
			}
		});

		const handle = await shim.fsDriver().open(absPath, 'rw');

		let offset = 0;
		let lastOffset = -1;
		while (offset < sizeBytes && offset !== lastOffset) {
			const part = await shim.fsDriver().readFileChunkAsBuffer(handle, chunkSize);
			entry.write(part);

			lastOffset = offset;
			offset += part.byteLength;
		}
		entry.end();
	}

	pack.finalize();

	// The streams used by tar-stream seem not to support a chunk size
	// (it seems despite the typings provided).
	let data: number[]|null = null;
	while ((data = pack.read()) !== null) {
		const buff = Buffer.from(data);
		const base64Data = buff.toString('base64');
		await fsDriver.appendFile(file, base64Data, 'base64');
	}

	if (errors.length) {
		throw new Error(`tarCreate errors: ${errors.map(e => `Error: ${e}, stack: ${e?.stack}`)}`);
	}
};

export default tarCreate;
