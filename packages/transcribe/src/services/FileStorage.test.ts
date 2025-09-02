import { readdir, copyFile, exists, remove } from 'fs-extra';
import { join } from 'path';
import FileStorage from './FileStorage';
import initiateLogger from './initiateLogger';
import Logger from '@joplin/utils/Logger';

describe('FileStorage', () => {

	beforeAll(() => {
		initiateLogger();
		Logger.globalLogger.enabled = false;
	});

	it('should move file to storage folder', async () => {
		await copyFile('./images/htr_sample.png', './test_file.png');

		const fs = new FileStorage();
		const name = await fs.store('./test_file.png');

		const destination = join('images', name);
		const destinationStillExists = await exists(destination);
		expect(destinationStillExists).toBe(true);

		await remove(destination);
	});


	it('should remove the original file', async () => {
		await copyFile('./images/htr_sample.png', './test_file.png');

		const fs = new FileStorage();
		const name = await fs.store('./test_file.png');

		const originalStillExists = await exists('./test_file.png');
		expect(originalStillExists).toBe(false);

		await remove(join('images', name));
	});

	it('should remove files that are older than the given date', async () => {
		const mockedFilenames = [
			`${new Date('2025-03-01 17:44').getTime()}_should_delete`,
			`${new Date('2025-03-02 17:44').getTime()}_should_delete`,
			`${new Date('2025-03-04 17:44').getTime()}_not_deleted`,
		];
		const mockedFiles = mockedFilenames.map(name => join('images', name));
		for (const file of mockedFiles) {
			await copyFile('./images/htr_sample.png', file);
		}

		const fs = new FileStorage();
		await fs.removeOldFiles(new Date('2025-03-03 12:00'));
		const files = await readdir('images');
		expect(files.length).toBe(2);
		expect(files.includes(mockedFilenames[2])).toBe(true);

		for (const file of mockedFiles) {
			await remove(file);
		}
	});
});

