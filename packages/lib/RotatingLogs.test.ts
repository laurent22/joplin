import { writeFile, readdir, remove } from 'fs-extra';
import { createTempDir, msleep } from './testing/test-utils';
import RotatingLogs from './RotatingLogs';

describe('RotatingLogs', () => {
	test('should rename log.txt to log-TIMESTAMP.txt and then delete it after 1ms', async () => {
		let dir: string;
		try {
			dir = await createTempDir();
			await writeFile(`${dir}/log.txt`, 'some content');
			let files: string[] = await readdir(dir);
			expect(files.find(file => file.match(/^log.txt$/gi))).toBeTruthy();
			expect(files.length).toBe(1);
			const rotatingLogs: RotatingLogs = new RotatingLogs(dir, 1, 1);
			await rotatingLogs.cleanActiveLogFile();
			files = await readdir(dir);
			expect(files.find(file => file.match(/^log.txt$/gi))).toBeFalsy();
			expect(files.find(file => file.match(/^log-[0-9]+.txt$/gi))).toBeTruthy();
			expect(files.length).toBe(1);
			await msleep(2);
			await rotatingLogs.deleteNonActiveLogFiles();
			files = await readdir(dir);
			expect(files.find(file => file.match(/^log-[0-9]+.txt$/gi))).toBeFalsy();
			expect(files.length).toBe(0);
		} finally {
			await remove(dir);
		}
	});
});
