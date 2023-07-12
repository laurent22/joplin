import { open, close, write, readdir, rm } from 'fs-extra';
import { createTempDir } from './testing/test-utils';
import RotatingLogs from './RotatingLogs';

jest.useFakeTimers();

const createEmptyFileOfSize = async (fileName: string, size: number) => {
	const fd = await open(fileName, 'w');
	await write(fd, 'test', size);
	await close(fd);
};

describe('RotatingLogs', () => {
	let dir: string;
	let files: string[];
	let rotatingLogs: RotatingLogs;

	beforeEach(async () => {
		dir = await createTempDir();
		rotatingLogs = new RotatingLogs(dir, 1024, 1000);
		await createEmptyFileOfSize(`${dir}/log.txt`, 1024);
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

	test('should delete inactive log file older than 1 second', async () => {
		await rotatingLogs.cleanActiveLogFile();
		files = await readdir(dir);
		expect(files.find(file => file.match(/^log-[0-9]+.txt$/gi))).toBeTruthy();
		setTimeout(async () => {
			await rotatingLogs.deleteNonActiveLogFiles();
			files = await readdir(dir);
			expect(files.find(file => file.match(/^log-[0-9]+.txt$/gi))).toBeFalsy();
		}, 1000);
	});
});
