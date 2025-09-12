import { readdir, copyFile, exists, remove } from 'fs-extra';
import { join } from 'path';
import FileStorage from './FileStorage';
import initiateLogger from './initiateLogger';
import Logger from '@joplin/utils/Logger';

const imagesFolderPath = join(process.cwd(), 'images');

describe('FileStorage', () => {

	beforeAll(() => {
		initiateLogger();
		Logger.globalLogger.enabled = false;
	});

	it('should move file to storage folder', async () => {
		const originalFilePath = join(imagesFolderPath, 'htr_sample.png');
		const testFilePath = join(imagesFolderPath, 'test_file.png');
		await copyFile(originalFilePath, testFilePath);

		const fs = new FileStorage();
		const name = await fs.store(testFilePath);

		const destination = join(imagesFolderPath, name);
		const destinationStillExists = await exists(destination);
		expect(destinationStillExists).toBe(true);

		await remove(destination);
	});


	it('should remove the original file', async () => {
		const originalFilePath = join(imagesFolderPath, 'htr_sample.png');
		const testFilePath = join(imagesFolderPath, 'test_file.png');
		await copyFile(originalFilePath, testFilePath);

		const fs = new FileStorage();
		const name = await fs.store(testFilePath);

		const originalStillExists = await exists(testFilePath);
		expect(originalStillExists).toBe(false);

		await remove(join(imagesFolderPath, name));
	});

	it('should remove files that are older than the given date', async () => {
		const originalFilePath = join(imagesFolderPath, 'htr_sample.png');
		const mockedFilenames = [
			`${new Date('2025-03-01 17:44').getTime()}_should_delete`,
			`${new Date('2025-03-02 17:44').getTime()}_should_delete`,
			`${new Date('2025-03-04 17:44').getTime()}_not_deleted`,
		];
		const mockedFiles = mockedFilenames.map(name => join('images', name));
		for (const file of mockedFiles) {
			await copyFile(originalFilePath, file);
		}

		const fs = new FileStorage();
		await fs.removeOldFiles(new Date('2025-03-03 12:00'));
		const files = await readdir(imagesFolderPath);
		expect(files.length).toBe(2);
		expect(files.includes(mockedFilenames[2])).toBe(true);

		for (const file of mockedFiles) {
			await remove(join(imagesFolderPath, file));
		}
	});
});

