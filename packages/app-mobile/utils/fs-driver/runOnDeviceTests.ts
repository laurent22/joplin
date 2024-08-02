import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import uuid from '@joplin/lib/uuid';
import { join } from 'path';
import FsDriverBase from '@joplin/lib/fs-driver-base';
import Logger from '@joplin/utils/Logger';
import { Buffer } from 'buffer';
import createFilesFromPathRecord from './testUtil/createFilesFromPathRecord';
import verifyDirectoryMatches from './testUtil/verifyDirectoryMatches';

const logger = Logger.create('fs-driver-tests');

const expectToBe = async <T> (actual: T, expected: T) => {
	if (actual !== expected) {
		throw new Error(`Integration test failure: ${actual} was expected to be ${expected}`);
	}
};

const testExpect = async () => {
	// Verify that expect is working
	await expectToBe(1, 1);
	await expectToBe(true, true);

	let failed = false;
	try {
		await expectToBe('a', 'test');
		failed = true;
	} catch (_error) {
		failed = false;
	}

	if (failed) {
		throw new Error('expectToBe should throw when given non-equal inputs');
	}
};

const testAppendFile = async (tempDir: string) => {
	logger.info('Testing fsDriver.appendFile...');

	const targetFile = join(tempDir, uuid.createNano());

	const fsDriver: FsDriverBase = shim.fsDriver();

	// For fs-driver-rn's appendFile to work, we first need to create the file.
	// TODO: This is different from the requirements of fs-driver-node.
	await fsDriver.writeFile(targetFile, '');

	const firstChunk = 'A 𝓊𝓃𝒾𝒸𝓸𝒹𝓮 test\n...';
	await fsDriver.appendFile(targetFile, firstChunk, 'utf-8');
	await expectToBe(await fsDriver.readFile(targetFile), firstChunk);

	const secondChunk = '▪️  More unicode ▪️';
	await fsDriver.appendFile(targetFile, secondChunk, 'utf8');
	await expectToBe(await fsDriver.readFile(targetFile), firstChunk + secondChunk);

	const thirdChunk = 'ASCII';
	await fsDriver.appendFile(targetFile, thirdChunk, 'ascii');
	await expectToBe(await fsDriver.readFile(targetFile), firstChunk + secondChunk + thirdChunk);

	const lastChunk = 'Test...';
	await fsDriver.appendFile(
		targetFile, Buffer.from(lastChunk, 'utf8').toString('base64'), 'base64',
	);
	await expectToBe(
		await fsDriver.readFile(targetFile), firstChunk + secondChunk + thirdChunk + lastChunk,
	);

	// Should throw if given an invalid encoding
	let didThrow = false;
	try {
		await fsDriver.appendFile(targetFile, 'test', 'bad-encoding');
	} catch (_error) {
		didThrow = true;
	}
	await expectToBe(didThrow, true);
};

const testReadWriteFileUtf8 = async (tempDir: string) => {
	logger.info('Testing fsDriver.writeFile and fsDriver.readFile with utf-8...');

	const filePath = join(tempDir, uuid.createNano());

	const testStrings = [
		// ASCII
		'test',

		// Special characters
		'𝐴 𝒕𝐞𝑺𝒕',

		// Emojis
		'✅ Test. 🕳️',
	];

	const testEncodings = ['utf-8', 'utf8', 'UtF-8'];

	// Use the same file for all tests to test overwriting
	for (const encoding of testEncodings) {
		for (const testString of testStrings) {
			const fsDriver: FsDriverBase = shim.fsDriver();
			await fsDriver.writeFile(filePath, testString, encoding);

			const fileData = await fsDriver.readFile(filePath, encoding);
			await expectToBe(fileData, testString);
		}
	}
};

const testReadFileChunkUtf8 = async (tempDir: string) => {
	logger.info('Testing fsDriver.readFileChunk...');

	const filePath = join(tempDir, `${uuid.createNano()}.txt`);

	const fsDriver: FsDriverBase = shim.fsDriver();

	// 🕳️ is 7 bytes when utf-8 encoded
	// à,á,â, and ã are each 2 bytes
	const expectedFileContent = '01234567\nàáâã\n🕳️🕳️🕳️\ntēst...';
	await fsDriver.writeFile(filePath, expectedFileContent, 'utf8');

	const testEncodings = ['utf-8', 'utf8', 'UtF-8'];

	for (const encoding of testEncodings) {
		const handle = await fsDriver.open(filePath, 'r');

		await expectToBe(
			await fsDriver.readFileChunk(handle, 8, encoding), '01234567',
		);

		await expectToBe(
			await fsDriver.readFileChunk(handle, 1, encoding), '\n',
		);

		await expectToBe(
			await fsDriver.readFileChunk(handle, 8, encoding), 'àáâã',
		);

		await expectToBe(
			await fsDriver.readFileChunk(handle, 8, encoding), '\n🕳️',
		);

		await expectToBe(
			await fsDriver.readFileChunk(handle, 15, encoding), '🕳️🕳️\n',
		);

		// A 0 length should return null and not advance
		await expectToBe(
			await fsDriver.readFileChunk(handle, 0, encoding), null,
		);

		// Reading a different encoding (then switching back to the original)
		// should be supported
		await expectToBe(
			await fsDriver.readFileChunk(handle, 3, 'base64'),
			Buffer.from('tē', 'utf-8').toString('base64'),
		);

		await expectToBe(
			await fsDriver.readFileChunk(handle, 100, encoding), 'st...',
		);

		// Should not be able to read past the end
		await expectToBe(
			await fsDriver.readFileChunk(handle, 10, encoding), null,
		);

		await expectToBe(
			await fsDriver.readFileChunk(handle, 1, encoding), null,
		);

		await fsDriver.close(handle);
	}

	// Should throw when the file doesn't exist
	let readData = undefined;
	try {
		const handle = await fsDriver.open(`${filePath}.noexist`, 'r');
		readData = await fsDriver.readFileChunk(handle, 1, 'utf8');
	} catch (error) {
		await expectToBe(error.code, 'ENOENT');
	}

	// Should not have read any data
	await expectToBe(readData, undefined);
};

const testTarCreateAndExtract = async (tempDir: string) => {
	logger.info('Testing fsDriver.tarCreate...');

	const directoryToPack = join(tempDir, uuid.createNano());

	const fsDriver: FsDriverBase = shim.fsDriver();

	// Add test files to the directory
	const fileContents: Record<string, string> = {};

	// small utf-8 encoded files
	for (let i = 0; i < 10; i ++) {
		const testFileName = uuid.createNano();
		const fileContent = `✅ Testing... ä ✅ File #${i}`;

		fileContents[testFileName] = fileContent;
	}

	// larger utf-8 encoded files
	for (let i = 0; i < 3; i ++) {
		const testFileName = uuid.createNano();

		let fileContent = `✅ Testing... ä ✅ File #${i}`;
		for (let j = 0; j < 8; j ++) {
			fileContent += fileContent;
		}

		fileContents[testFileName] = fileContent;
	}

	await createFilesFromPathRecord(directoryToPack, fileContents);

	// Pack the files
	const pathsToTar = Object.keys(fileContents);
	const tarOutputPath = join(tempDir, 'test-tar.tar');
	await fsDriver.tarCreate({
		cwd: directoryToPack,
		file: tarOutputPath,
	}, pathsToTar);

	// Read the tar file as utf-8 and search for the written file contents
	// (which should work).
	const rawTarData: string = await fsDriver.readFile(tarOutputPath, 'utf8');

	for (const fileContent of Object.values(fileContents)) {
		await expectToBe(rawTarData.includes(fileContent), true);
	}

	logger.info('Testing fsDriver.tarExtract...');

	const outputDirectory = join(tempDir, uuid.createNano());
	await fsDriver.mkdir(outputDirectory);
	await fsDriver.tarExtract({
		cwd: outputDirectory,
		file: tarOutputPath,
	});

	await verifyDirectoryMatches(outputDirectory, fileContents);
};

const testMd5File = async (tempDir: string) => {
	logger.info('Testing fsDriver.md5file...');
	const fsDriver = shim.fsDriver();

	const testFilePath = join(tempDir, `test-md5-${uuid.createNano()}`);
	await fsDriver.writeFile(testFilePath, '🚧test', 'utf8');

	await expectToBe(await fsDriver.md5File(testFilePath), 'ba11ba1be5042133a71874731e3d42cd');
};

// In the past, some fs-driver functionality has worked correctly on some devices and not others.
// As such, we need to be able to run some tests on-device.
const runOnDeviceTests = async () => {
	const tempDir = join(Setting.value('tempDir'), uuid.createNano());

	if (await shim.fsDriver().exists(tempDir)) {
		await shim.fsDriver().remove(tempDir);
	}
	await shim.fsDriver().mkdir(tempDir);

	try {
		await testExpect();
		await testAppendFile(tempDir);
		await testReadWriteFileUtf8(tempDir);
		await testReadFileChunkUtf8(tempDir);
		await testTarCreateAndExtract(tempDir);
		await testMd5File(tempDir);

		logger.info('Done');
	} catch (error) {
		const errorMessage = `On-device testing failed with an exception: ${error}.`;

		logger.error(errorMessage, error);
		alert(errorMessage);
	} finally {
		await shim.fsDriver().remove(tempDir);
	}
};

export default runOnDeviceTests;
