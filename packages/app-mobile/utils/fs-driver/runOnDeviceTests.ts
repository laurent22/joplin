import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import uuid from '@joplin/lib/uuid';
import { join } from 'path';
import { Buffer } from 'buffer';
import appendBinaryReadableToFile from './utils/appendBinaryReadableToFile';
import stringToBytes from './utils/stringToBytes';
import FsDriverBase from '@joplin/lib/fs-driver-base';
import tarCreate from './tarCreate';


const expectToBe = async <T> (a: T, b: T) => {
	if (a !== b) {
		try {
			throw new Error(`Integration test failure: ${a} was expected to be ${b}`);
		} finally {
			alert(`Integration test failure: ${a} !== ${b}`);
		}
	}
};

const testExpect = async () => {
	// Verify that expect is working
	await expectToBe(1, 1);
	await expectToBe(true, true);
};

const testBinaryAppend = async (tempDir: string) => {
	const filePath = join(tempDir, uuid.createNano());

	let index = 0;
	const dataChunks = [
		// ASCII
		'test',

		// Special characters
		'𝐴 𝒕𝐞𝑺𝒕',

		// Breaking unicode into chunks
		'🕳️'.substring(0, 1), '🕳️'.substring(1),
	];

	const generateData = () => {
		const nextIndex = index;

		if (nextIndex < dataChunks.length) {
			index++;
			return stringToBytes(dataChunks[nextIndex]);
		} else {
			return null;
		}
	};

	const fsDriver: FsDriverBase = shim.fsDriver();

	await appendBinaryReadableToFile(fsDriver, filePath, { read: generateData });

	// Reading the file should produce the concatenation of the chunks
	const fileDataBase64 = await fsDriver.readFile(filePath, 'base64');
	const fileDataBuffer = Buffer.from(fileDataBase64, 'base64');
	await expectToBe(fileDataBuffer.toString('utf16le'), dataChunks.join(''));
};

const testWriteFileUtf8 = async (tempDir: string) => {
	const fsDriver: FsDriverBase = shim.fsDriver();
	const filePath = join(tempDir, uuid.createNano());

	const originalText = 'Test. 🕳️';
	await fsDriver.writeFile(filePath, originalText, 'utf-8');

	const fileDataBase64 = await fsDriver.readFile(filePath, 'base64');
	const fileDataBuffer = Buffer.from(fileDataBase64, 'base64');
	const fileDataString = fileDataBuffer.toString('utf-8');

	await expectToBe(fileDataString, originalText);
};

const testTar = async (tempDir: string) => {
	const fsDriver: FsDriverBase = shim.fsDriver();

	const sourceDirectory = join(tempDir, 'test-tar');
	const sourceFile = join(sourceDirectory, 'test.txt');
	await fsDriver.writeFile(sourceFile, 'Test: 🕳️. This is a téśt.', 'utf-8');
	const outputTarFile = join(tempDir, 'test.tar');

	await tarCreate(fsDriver, {
		cwd: tempDir,
		file: outputTarFile,
	}, [sourceFile]);

	const fileDataBase64 = await fsDriver.readFile(outputTarFile, 'base64');
	const fileDataBuffer = Buffer.from(fileDataBase64, 'base64');
	const textData = fileDataBuffer.toString('utf-8');

	await expectToBe(textData.indexOf('🕳️') > 0, true);
};

// In the past, tarCreate has worked correctly on some devices and not others.
// As such, we need to be able to run some tests on-device.
const runOnDeviceTests = async () => {
	const tempDir = join(Setting.value('tempDir'), uuid.createNano());

	if (await shim.fsDriver().exists(tempDir)) {
		await shim.fsDriver().remove(tempDir);
	}

	try {
		await testExpect();
		await testBinaryAppend(tempDir);
		await testWriteFileUtf8(tempDir);
		await testTar(tempDir);
	} catch (error) {
		alert(`On-device testing failed: ${error}, ${JSON.stringify(error)}`);
	} finally {
		await shim.fsDriver().remove(tempDir);
	}
};

export default runOnDeviceTests;
