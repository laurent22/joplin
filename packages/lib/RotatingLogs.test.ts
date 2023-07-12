import { open, close, writeFile, readdir, rm } from 'fs-extra';
import { createTempDir, msleep } from './testing/test-utils';
import RotatingLogs from './RotatingLogs';

const createTestFile = async (fileName: string) => {
	const fd = await open(fileName, 'w');
	await writeFile(fd, 'some content');
	await close(fd);
};

describe('RotatingLogs', () => {
	let dir: string;
	let files: string[];
	let rotatingLogs: RotatingLogs;

	beforeEach(async () => {
		dir = await createTempDir();
		rotatingLogs = new RotatingLogs(dir, 1, 1);
		await createTestFile(`${dir}/log.txt`);
	});

	afterEach(async () => {
		files = [];
		await rm(dir, { recursive: true });
	});

	test('should exists an log.txt file inside the folder', async () => {
		files = await readdir(dir);
		expect(files.find(file => file.match(/^log.txt$/gi))).toBeTruthy();
	});

	test('should rename log.txt to log-TIMESTAMP.txt', async () => {
		await rotatingLogs.cleanActiveLogFile();
		files = await readdir(dir);
		expect(files.find(file => file.match(/^log.txt$/gi))).toBeFalsy();
		expect(files.find(file => file.match(/^log-[0-9]+.txt$/gi))).toBeTruthy();
	});

	test('should delete inactive log file older than 1ms', async () => {
		await rotatingLogs.cleanActiveLogFile();
		files = await readdir(dir);
		expect(files.find(file => file.match(/^log-[0-9]+.txt$/gi))).toBeTruthy();
		await msleep(2);
		await rotatingLogs.deleteNonActiveLogFiles();
		files = await readdir(dir);
		expect(files.find(file => file.match(/^log-[0-9]+.txt$/gi))).toBeFalsy();
	});
});
