
import tarCreate from './tarCreate';

import { mkdirs, rm } from 'fs-extra';
import FsDriverNode from '@joplin/lib/fs-driver-node';

import { createTempDirPath } from '@joplin/lib/testing/test-utils';
import { testTarImplementations } from './testing';

const tempDirectoryPath = createTempDirPath();

describe('tarCreate', () => {
	beforeEach(async () => {
		await mkdirs(tempDirectoryPath);
	});

	afterEach(async () => {
		await rm(tempDirectoryPath, { recursive: true, force: true });
	});

	it('should create a tar file that can be unpacked with node-tar', async () => {
		const fsDriver = new FsDriverNode();

		// Use the node fsdriver implementation of tar extraction for comparison
		await testTarImplementations(
			tempDirectoryPath,
			async (outputTarFile, inputFiles) => {
				await tarCreate(fsDriver, {
					cwd: tempDirectoryPath,
					file: outputTarFile,
				}, inputFiles);
			},
			async (inputTarFile) => {
				await fsDriver.tarExtract({
					strict: true,
					portable: true,
					file: inputTarFile,
					cwd: tempDirectoryPath,
				});
			},
			async (actual, expected) => {
				expect(actual).toBe(expected);
			},
		);
	});
});
