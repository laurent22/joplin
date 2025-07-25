import { copyFile, exists, remove } from 'fs-extra';
import { join } from 'path';
import FileStorage from './FileStorage';

describe('FileStorage', () => {

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

});

