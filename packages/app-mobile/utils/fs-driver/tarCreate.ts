import { pack as tarStreamPack } from 'tar-stream';
import { resolve } from 'path';
import FsDriverBase from '@joplin/lib/fs-driver-base';
import * as RNFS from 'react-native-fs';

import Logger from '@joplin/utils/Logger';
import { chunkSize } from './constants';

const logger = Logger.create('fs-driver-rn');

interface TarCreateOptions {
	cwd: string;
	file: string;
}

// TODO: Support globbing directories contained in filePaths
//       like node-tar. (The fs-driver-node implementation of tarCreate).

const tarCreate = async (fsDriver: FsDriverBase, options: TarCreateOptions, filePaths: string[]) => {
	// Choose a default cwd if not given
	const cwd = options.cwd ?? RNFS.DocumentDirectoryPath;
	const file = resolve(cwd, options.file);

	if (await fsDriver.exists(file)) {
		throw new Error('Error! Destination already exists');
	}

	const pack = tarStreamPack();

	for (const path of filePaths) {
		const absPath = resolve(cwd, path);
		const stat = await fsDriver.stat(absPath);
		const sizeBytes: number = stat.size;

		const entry = pack.entry({ name: path, size: sizeBytes }, (error) => {
			if (error) {
				logger.error(`Tar error: ${error}`);
			}
		});

		for (let offset = 0; offset < sizeBytes; offset += chunkSize) {
			// The RNFS documentation suggests using base64 for binary files.
			const part = await RNFS.read(absPath, chunkSize, offset, 'base64');
			entry.write(Buffer.from(part, 'base64'));
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
};

export default tarCreate;
