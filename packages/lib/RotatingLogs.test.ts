import { writeFile, readdir, remove, readFile } from 'fs-extra';
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
			expect(files.find(file => file.match(/^log.txt$/gi))).toBeTruthy();
			expect(files.find(file => file.match(/^log-[0-9]+.txt$/gi))).toBeTruthy();
			expect(files.length).toBe(2);
		} finally {
			await remove(dir);
		}
	});

	test('should the content of log-TIMESTAMP.txt to be equal to the content of log.txt', async () => {
		let dir: string;
		try {
			dir = await createTempDir();
			await createTestLogFile(dir);
			let files: string[] = await readdir(dir);
			const logTxtContent: string = await readFile(`${dir}/log.txt`);
			const rotatingLogs: RotatingLogs = new RotatingLogs(dir, 1, 1);
			await rotatingLogs.cleanActiveLogFile();
			files = await readdir(dir);
			const logTimestampTxt: string = files.find(file => file.match(/^log-[0-9]+.txt$/gi));
			const logTimestampTxtContent: string = await readFile(`${dir}/${logTimestampTxt}`);
			expect(logTxtContent).toEqual(logTimestampTxtContent);
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
			const files = await readdir(dir);
			expect(files.find(file => file.match(/^log-[0-9]+.txt$/gi))).toBeFalsy();
			expect(files.length).toBe(1);
		} finally {
			await remove(dir);
		}
	});
});
