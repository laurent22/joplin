const fs = require('fs');
import { readdir } from 'node:fs/promises';
import RotatingLogs from './RotatingLogs';
import { createTempDir } from './testing/test-utils';

const createEmptyFileOfSize = (fileName: string, size: number) => {
	return new Promise((resolve, reject) => {
		try {
			const fd = fs.openSync(fileName, 'w');
			fs.writeSync(fd, 'test', size);
			resolve(true);
		} catch (error) {
			reject(error);
		}
	});
};

describe('RotatingLogs', () => {
	let dir: string;
	let files: string[];
	let rotatingLogs: RotatingLogs;

	beforeAll(async () => {
		dir = await createTempDir();
		rotatingLogs = new RotatingLogs(dir);
		await createEmptyFileOfSize(`${dir}/log.txt`, 1024 * 1024 * 100);
	});

	beforeEach(() => {
		files = [];
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
});
