
// tarExtract has tests both in runOnDeviceTests and here.
// Just Jest tests aren't sufficient in this case because, in the past, differences
// between polyfilled and node-built-in libraries have caused issues.

import shim from '@joplin/lib/shim';
import { createTempDir } from '@joplin/lib/testing/test-utils';
import { join } from 'path';
import createFilesFromPathRecord from './testUtil/createFilesFromPathRecord';
import verifyDirectoryMatches from './testUtil/verifyDirectoryMatches';
import tarExtract from './tarExtract';
import { remove } from 'fs-extra';


const verifyTarWithContentExtractsTo = async (filePaths: Record<string, string>) => {
	const tempDir = await createTempDir();

	try {
		const sourceDirectory = join(tempDir, 'source');
		await createFilesFromPathRecord(sourceDirectory, filePaths);

		const tarOutputFile = join(tempDir, 'test.tar');
		// Uses node tar during testing
		await shim.fsDriver().tarCreate(
			{ cwd: sourceDirectory, file: tarOutputFile }, Object.keys(filePaths),
		);

		const outputDirectory = join(tempDir, 'dest');
		await tarExtract({
			cwd: outputDirectory,
			file: tarOutputFile,
		});

		await verifyDirectoryMatches(outputDirectory, filePaths);
	} finally {
		await remove(tempDir);
	}
};

describe('tarExtract', () => {
	it('should extract a tar with a single file', async () => {
		await verifyTarWithContentExtractsTo({
			'a.txt': 'Test',
		});
	});

	it('should extract tar files containing unicode characters', async () => {
		await verifyTarWithContentExtractsTo({
			'a.txt': 'Test✅',
			'b/á-test.txt': 'Test letters: ϑ, ó, ö, ś',
			'c/á-test.txt': 'This also works.',
		});
	});

	it('should extract tar files with deeply nested subdirectories', async () => {
		await verifyTarWithContentExtractsTo({
			'a.txt': 'Test✅',
			'b/c/d/e/f/test-Ó.txt': 'Test letters: ϑ, ó, ö, ś',
			'b/c/d/e/f/test2.txt': 'This works.',
			'b/test3.txt': 'This also works.',
			'b/test4.txt': 'This also works...',
			'b/c/test4.txt': 'This also works.',
		});
	});
});
