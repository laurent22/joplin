import { writeFile, readdir, remove } from 'fs-extra';
import { createTempDir, msleep } from './testing/test-utils';
import RotatingLogs from './RotatingLogs';

const createTestLogFile = async (dir: string) => {
	await writeFile(`${dir}/log.txt`, 'some content');
};

describe('RotatingLogs', () => {
	test('should rename log.txt to log-TIMESTAMP.txt', async () => {
		let dir: string;
		try {
			dir = await createTempDir();
			await createTestLogFile(dir);
			let files: string[] = await readdir(dir);
			expect(files.find(file => file.match(/^log.txt$/gi))).toBeTruthy();
			expect(files.length).toBe(1);
			const rotatingLogs: RotatingLogs = new RotatingLogs(dir, 1, 1);
			await rotatingLogs.cleanActiveLogFile();
			files = await readdir(dir);
			expect(files.find(file => file.match(/^log.txt$/gi))).toBeFalsy();
			expect(files.find(file => file.match(/^log-[0-9]+.txt$/gi))).toBeTruthy();
			expect(files.length).toBe(1);
		} finally {
			await remove(dir);
		}
	});

	test('should delete inactive log file after 1ms', async () => {
		let dir: string;
		try {
			dir = await createTempDir();
			await createTestLogFile(dir);
			const rotatingLogs: RotatingLogs = new RotatingLogs(dir, 1, 1);
			await rotatingLogs.cleanActiveLogFile();
			await msleep(1);
			await rotatingLogs.deleteNonActiveLogFiles();
			const files: string[] = await readdir(dir);
			expect(files.find(file => file.match(/^log-[0-9]+.txt$/gi))).toBeFalsy();
			expect(files.length).toBe(0);
		} finally {
			await remove(dir);
		}
	});

	test('should not delete the log-timestamp.txt right after its be created', async () => {
		let dir: string;
		try {
			dir = await createTempDir();
			await createTestLogFile(dir);
			await msleep(1000);
			const rotatingLogs: RotatingLogs = new RotatingLogs(dir, 1, 1000);
			await rotatingLogs.cleanActiveLogFile();
			await rotatingLogs.deleteNonActiveLogFiles();
			const files: string[] = await readdir(dir);
			expect(files.find(file => file.match(/^log-[0-9]+.txt$/gi))).toBeTruthy();
			expect(files.length).toBe(1);
		} finally {
			await remove(dir);
		}
	});
});
