import { open, close, writeFile, readdir, remove } from 'fs-extra';
import { createTempDir, msleep } from './testing/test-utils';
import RotatingLogs from './RotatingLogs';

const createTestFile = async (dir: string, fileName: string) => {
	const fd = await open(`${dir}/${fileName}`, 'w');
	await writeFile(fd, 'some content');
	await close(fd);
};

describe('RotatingLogs', () => {
	test('should exists an log.txt file inside the folder', async () => {
		const dir = await createTempDir();
		await createTestFile(dir, 'log.txt');
		const files = await readdir(dir);
		expect(files.find(file => file.match(/^log.txt$/gi))).toBeTruthy();
		await remove(dir);
	});

	test('should rename log.txt to log-TIMESTAMP.txt', async () => {
		const dir = await createTempDir();
		await createTestFile(dir, 'log.txt');
		const rotatingLogs = new RotatingLogs(dir, 1, 1);
		await rotatingLogs.cleanActiveLogFile();
		const files = await readdir(dir);
		expect(files.find(file => file.match(/^log.txt$/gi))).toBeFalsy();
		expect(files.find(file => file.match(/^log-[0-9]+.txt$/gi))).toBeTruthy();
		await remove(dir);
	});

	test('should delete inactive log file older than 1ms', async () => {
		const dir = await createTempDir();
		await createTestFile(await createTempDir(), 'log.txt');
		const rotatingLogs = new RotatingLogs(dir, 1, 1);
		await rotatingLogs.cleanActiveLogFile();
		let files = await readdir(dir);
		expect(files.find(file => file.match(/^log-[0-9]+.txt$/gi))).toBeTruthy();
		await msleep(2);
		await rotatingLogs.deleteNonActiveLogFiles();
		files = await readdir(dir);
		expect(files.find(file => file.match(/^log-[0-9]+.txt$/gi))).toBeFalsy();
		await remove(dir);
	});
});
