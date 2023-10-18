import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import uuid from '@joplin/lib/uuid';
import { join } from 'path';
import FsDriverBase from '@joplin/lib/fs-driver-base';
import Logger from '@joplin/utils/Logger';
import { Buffer } from 'buffer';

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
	const expectedFileContent = '01234567\nàáâã\n🕳️🕳️🕳️\ntest';
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

		await expectToBe(
			await fsDriver.readFileChunk(handle, 100, encoding), 'test',
		);

		// Should not be able to read past the end
		await expectToBe(
			await fsDriver.readFileChunk(handle, 10, encoding), null,
		);

		await expectToBe(
			await fsDriver.readFileChunk(handle, 1, encoding), null,
		);

		await fsDriver.close(filePath);
	}
};

// In the past, some fs-driver functionality has worked correctly on some devices and not others.
// As such, we need to be able to run some tests on-device.
const runOnDeviceTests = async () => {
	const tempDir = join(Setting.value('tempDir'), uuid.createNano());

	if (await shim.fsDriver().exists(tempDir)) {
		await shim.fsDriver().remove(tempDir);
	}

	try {
		await testExpect();
		await testAppendFile(tempDir);
		await testReadWriteFileUtf8(tempDir);
		await testReadFileChunkUtf8(tempDir);
	} catch (error) {
		const errorMessage = `On-device testing failed with an exception: ${error}.`;

		logger.error(errorMessage, error);
		alert(errorMessage);
	} finally {
		await shim.fsDriver().remove(tempDir);
	}
};

export default runOnDeviceTests;
