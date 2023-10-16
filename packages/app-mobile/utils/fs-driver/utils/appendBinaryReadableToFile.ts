import FsDriverBase from '@joplin/lib/fs-driver-base';
import { Buffer } from 'buffer';

const appendBinaryReadableToFile = async (
	fsDriver: FsDriverBase, path: string, readable: { read(): number[]|null },
) => {
	let data: number[]|null = null;
	while ((data = readable.read()) !== null) {
		const buff = Buffer.from(data);
		const base64Data = buff.toString('base64');
		await fsDriver.appendFile(path, base64Data, 'base64');
	}
};

export default appendBinaryReadableToFile;
