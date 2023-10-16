import { chunkSize } from './constants';

import { join, resolve, relative } from 'node:path';
import uuid from '@joplin/lib/uuid';
import { exists, mkdirp, readFile, rm, writeFile } from 'fs-extra';

// Creates a subdirectory of parentDirectory with test data
export const createTestFiles = async (parentDirectory: string) => {
	const rootDirectory = join(parentDirectory, `test-${uuid.createNano()}`);

	const initialFileContent: Record<string, string> = {};
	const expectedPaths: string[] = [];

	// Path should be relative to the root directory
	const addFile = async (path: string, content: string) => {
		const absPath = resolve(rootDirectory, path);
		await writeFile(absPath, content, 'utf-8');

		const relativePath = relative(parentDirectory, absPath);
		initialFileContent[relativePath] = content;
		expectedPaths.push(relativePath);
	};

	const addDirectory = async (path: string) => {
		const absPath = resolve(rootDirectory, path);
		await mkdirp(absPath);

		const relativePath = relative(parentDirectory, absPath);
		expectedPaths.push(relativePath);
	};

	await addDirectory('.');
	await addDirectory('test-a');
	await addDirectory('test-a/test-2');
	await addFile('a.txt', 'Testing...');
	await addFile('b.txt', 'This is a test');
	await addFile('test-a/c.txt', 'Another test...');
	await addFile('test-a/d.txt', 'Test with other characters: ≤ áéíóú ≥ emoji: 😶‍🌫️');

	// Generate content larger than the chunk size
	const longFileContentChunks: string[] = [];

	while (longFileContentChunks.length * 4 < chunkSize * 2) {
		longFileContentChunks.push('test');
	}
	const longFileContent = longFileContentChunks.join('');
	await addFile('test-a/test-2/long.txt', longFileContent);

	return {
		filesAndDirectories: expectedPaths,
		initialFileContent,
		rootDirectory,

		removeAll: async () => {
			await rm(rootDirectory, { recursive: true, force: true });
		},
	};
};

type PackCallback = (tarFilePath: string, inputFilePaths: string[])=> Promise<void>;
type ExtractCallback = (tarFilepath: string)=> Promise<void>;

export const testTarImplementations = async (
	tempDirectoryPath: string,
	pack: PackCallback,
	extract: ExtractCallback,
) => {
	const testFiles = await createTestFiles(tempDirectoryPath);

	const tarFilePath = join(tempDirectoryPath, 'test.tar');

	// Get only files (exclude directories). For now,
	// tarCreate doesn't properly support the inclusion of directories
	// in the input list.
	const files = Object.keys(testFiles.initialFileContent);
	await pack(tarFilePath, files);

	// Remove all files that were added to the archive so that they can be
	// re-extracted.
	await testFiles.removeAll();

	// Use the node fsdriver implementation for comparison
	await extract(tarFilePath);

	// Check that the extracted content is correct.
	for (const path of testFiles.filesAndDirectories) {
		expect(await exists(resolve(tempDirectoryPath, path))).toBe(true);
	}

	for (const filePath in testFiles.initialFileContent) {
		const absPath = resolve(tempDirectoryPath, filePath);
		const expected = testFiles.initialFileContent[filePath];
		expect(await readFile(absPath, { encoding: 'utf-8' })).toBe(expected);
	}
};
