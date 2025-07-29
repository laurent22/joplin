import { copyFile, exists, remove } from 'fs-extra';
import { join } from 'path';
import FileStorage from './FileStorage';
import * as fsExtra from 'fs-extra';
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
		jest.spyOn(fsExtra, 'readdir').mockImplementation(
			() => Promise.resolve(mockedFilenames),
		);
		const mockedRemove = jest.fn();
		jest.spyOn(fsExtra, 'remove').mockImplementation(mockedRemove);

		const fs = new FileStorage();
		await fs.removeOldFiles(new Date('2025-03-03 12:00'));
		expect(mockedRemove).toHaveBeenCalledTimes(2);
		expect(mockedRemove).toHaveBeenCalledWith(join('images', mockedFilenames[0]));
		expect(mockedRemove).toHaveBeenCalledWith(join('images', mockedFilenames[1]));
	});
});

