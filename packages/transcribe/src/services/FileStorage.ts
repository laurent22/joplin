import { join } from 'path';
import { copyFile } from 'fs-extra';
import { randomBytes } from 'crypto';
import { ContentStorage } from '../types';

export default class FileStorage implements ContentStorage {

	public async store(filepath: string) {
		const randomName = randomBytes(16).toString('hex');
		await copyFile(filepath, join('images', randomName));
		return randomName;
	}
}
