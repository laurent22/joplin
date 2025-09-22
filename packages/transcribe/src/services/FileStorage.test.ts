import { readdir, copyFile, exists, remove, mkdirp } from 'fs-extra';
import { dirname, join } from 'path';
import FileStorage from './FileStorage';
import initiateLogger from './initiateLogger';
import Logger from '@joplin/utils/Logger';

const transcribeDir = dirname(dirname(dirname(__dirname)));

const imagesFolderPath = join(transcribeDir, 'images');
const tempDir = join(transcribeDir, 'temp');

const clearImageFolder = async () => {
	const files = await readdir(imagesFolderPath);
	for (const file of files) {
		if (file === 'htr_sample.png') continue;
		await remove(`${imagesFolderPath}/${file}`);
	}
};

describe('FileStorage', () => {

	beforeAll(async () => {
		initiateLogger();
		Logger.globalLogger.enabled = false;
	});

	beforeEach(async () => {
		await clearImageFolder();
		await remove(tempDir);
		await mkdirp(tempDir);
	});

	afterEach(async () => {
		await clearImageFolder();
		await remove(tempDir);
	});

	it('should move file to storage folder', async () => {
		const originalFilePath = join(imagesFolderPath, 'htr_sample.png');
		const testFilePath = join(tempDir, 'test_file.png');
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
		const testFilePath = join(tempDir, 'test_file.png');
		await copyFile(originalFilePath, testFilePath);

		const fs = new FileStorage();
		const name = await fs.store(testFilePath);

		const originalStillExists = await exists(testFilePath);
		expect(originalStillExists).toBe(false);

		await remove(join(imagesFolderPath, name));
	});

	it('should remove files that are older than the given date', async () => {
		const originalFilePath = join(imagesFolderPath, 'htr_sample.png');
		const testFilenames = [
			`${new Date('2025-03-01 17:44').getTime()}_should_delete`,
			`${new Date('2025-03-02 17:44').getTime()}_should_delete`,
			`${new Date('2025-03-04 17:44').getTime()}_not_deleted`,
		];

		for (const testFilename of testFilenames) {
			await copyFile(originalFilePath, `${imagesFolderPath}/${testFilename}`);
		}

		const fs = new FileStorage();
		await fs.removeOldFiles(new Date('2025-03-03 12:00'));
		const files = await readdir(imagesFolderPath);
		expect(files.length).toBe(2);
		expect(files.includes(testFilenames[2])).toBe(true);

		for (const testFilename of testFilenames) {
			await remove(`${imagesFolderPath}/${testFilename}`);
		}
	});
});

