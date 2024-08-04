import { EncryptionMethod } from './EncryptionService';
import EncryptionService from './EncryptionService';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import MasterKey from '../../models/MasterKey';
import Setting from '../../models/Setting';
import shim from '../..//shim';
import { getEncryptionEnabled, setEncryptionEnabled } from '../synchronizer/syncInfoUtils';

interface DecryptTestData {
	method: EncryptionMethod;
	password: string;
	plaintext: string;
	ciphertext: string;
}

const serviceInstance = EncryptionService.instance();

// This is convenient to quickly generate some data to verify for example that
// react-native-quick-crypto and node:crypto can decrypt the same data.
export async function createDecryptTestData() {
	const method = EncryptionMethod.StringV1;
	const password = 'just testing';
	const plaintext = '中文にっぽんご한국어😀\uD83D\0\r\nenglish01234567890';
	const ciphertext = await serviceInstance.encrypt(method, password, plaintext);

	return {
		method: method,
		password: password,
		plaintext: plaintext,
		ciphertext: ciphertext,
	};
}

interface CheckTestDataOptions {
	throwOnError?: boolean;
	silent?: boolean;
	testLabel?: string;
}

export async function checkDecryptTestData(data: DecryptTestData, options: CheckTestDataOptions = null) {
	options = {
		throwOnError: false,
		silent: false,
		...options,
	};

	// Verify that the ciphertext decrypted on this device and producing the same plaintext.
	const messages: string[] = [];
	let hasError = false;

	try {
		const decrypted = await EncryptionService.instance().decrypt(data.method, data.password, data.ciphertext);
		if (decrypted !== data.plaintext) {
			messages.push('Crypto Tests: Data could not be decrypted');
			messages.push('Crypto Tests: Expected:', data.plaintext);
			messages.push('Crypto Tests: Got:', decrypted);
			hasError = true;
		} else {
			messages.push('Crypto Tests: Data could be decrypted');
		}
	} catch (error) {
		hasError = true;
		messages.push(`Crypto Tests: Failed to decrypt data: Error: ${error}`);
	}

	if (hasError && options.throwOnError) {
		const label = options.testLabel ? ` (test ${options.testLabel})` : '';
		throw new Error(`Testing Crypto failed${label}: \n${messages.join('\n')}`);
	} else {
		for (const msg of messages) {
			if (hasError) {
				console.warn(msg);
			} else {
				// eslint-disable-next-line no-console
				if (!options.silent) console.info(msg);
			}
		}
	}
}

export async function testStringPerformance(chunkSize: number, method: EncryptionMethod, dataSize: number, count: number, options: CheckTestDataOptions = null) {
	options = {
		throwOnError: false,
		silent: false,
		...options,
	};

	// Verify that the ciphertext decrypted on this device and producing the same plaintext.
	const messages: string[] = [];
	let hasError = false;

	try {
		serviceInstance.defaultEncryptionMethod_ = method;
		serviceInstance.chunkSize_ = chunkSize;
		let masterKey = await serviceInstance.generateMasterKey('123456');
		masterKey = await MasterKey.save(masterKey);
		await serviceInstance.loadMasterKey(masterKey, '123456', true);

		const crypto = shim.crypto;

		const content = (await crypto.randomBytes(dataSize / 2)).toString('hex');
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'encrypted note', body: content, parent_id: folder.id });

		let encryptTime = 0.0;
		let decryptTime = 0.0;
		for (let i = 0; i < count; i++) {
			const tick1 = performance.now();
			const serialized = await Note.serializeForSync(note);
			const tick2 = performance.now();
			const deserialized = await Note.unserialize(serialized);
			const decryptedNote = await Note.decrypt(deserialized);
			const tick3 = performance.now();
			(decryptedNote.title === note.title);
			encryptTime += tick2 - tick1;
			decryptTime += tick3 - tick2;
		}

		messages.push(`Crypto Tests: testStringPerformance(): chunkSize: ${chunkSize}, method: ${method}, count: ${count}, dataSize: ${dataSize}, encryptTime: ${encryptTime}, decryptTime: ${decryptTime}, encryptTime/count: ${encryptTime / count}, decryptTime/count: ${decryptTime / count}.`);

	} catch (error) {
		hasError = true;
		messages.push(`Crypto Tests: testStringPerformance() failed. Error: ${error}`);
	}

	if (hasError && options.throwOnError) {
		const label = options.testLabel ? ` (test ${options.testLabel})` : '';
		throw new Error(`Testing Crypto failed${label}: \n${messages.join('\n')}`);
	} else {
		for (const msg of messages) {
			if (hasError) {
				console.warn(msg);
			} else {
				// eslint-disable-next-line no-console
				if (!options.silent) console.info(msg);
			}
		}
	}
}

export async function testFilePerformance(chunkSize: number, method: EncryptionMethod, dataSize: number, count: number, options: CheckTestDataOptions = null) {
	options = {
		throwOnError: false,
		silent: false,
		...options,
	};

	// Verify that the ciphertext decrypted on this device and producing the same plaintext.
	const messages: string[] = [];
	let hasError = false;

	try {
		serviceInstance.defaultFileEncryptionMethod_ = method;
		serviceInstance.chunkSize_ = chunkSize;
		let masterKey = await serviceInstance.generateMasterKey('123456');
		masterKey = await MasterKey.save(masterKey);
		await serviceInstance.loadMasterKey(masterKey, '123456', true);

		const fsDriver = shim.fsDriver();
		const crypto = shim.crypto;

		const sourcePath = `${Setting.value('tempDir')}/testData.txt`;
		const encryptedPath = `${Setting.value('tempDir')}/testData.crypted`;
		const decryptedPath = `${Setting.value('tempDir')}/testData.decrypted`;
		await fsDriver.writeFile(sourcePath, '');
		await fsDriver.appendFile(sourcePath, (await crypto.randomBytes(dataSize)).toString('base64'), 'base64');

		let encryptTime = 0.0;
		let decryptTime = 0.0;
		for (let i = 0; i < count; i++) {
			const tick1 = performance.now();
			await serviceInstance.encryptFile(sourcePath, encryptedPath);
			const tick2 = performance.now();
			await serviceInstance.decryptFile(encryptedPath, decryptedPath);
			const tick3 = performance.now();
			encryptTime += tick2 - tick1;
			decryptTime += tick3 - tick2;
		}

		messages.push(`Crypto Tests: testFilePerformance(): chunkSize: ${chunkSize}, method: ${method}, count: ${count}, dataSize: ${dataSize}, encryptTime: ${encryptTime}, decryptTime: ${decryptTime}, encryptTime/count: ${encryptTime / count}, decryptTime/count: ${decryptTime / count}.`);

	} catch (error) {
		hasError = true;
		messages.push(`Crypto Tests: testFilePerformance() failed. Error: ${error}`);
	}

	if (hasError && options.throwOnError) {
		const label = options.testLabel ? ` (test ${options.testLabel})` : '';
		throw new Error(`Testing Crypto failed${label}: \n${messages.join('\n')}`);
	} else {
		for (const msg of messages) {
			if (hasError) {
				console.warn(msg);
			} else {
				// eslint-disable-next-line no-console
				if (!options.silent) console.info(msg);
			}
		}
	}
}

// cSpell:disable

// Data generated on desktop, using node:crypto in packages/lib/services/e2ee/crypto.ts
const decryptTestData: Record<string, DecryptTestData> = {
	shortString: {
		method: EncryptionMethod.StringV1,
		password: '4BfJl8YbM,nXx.LVgs!AzkWWA]',
		plaintext: '中文にっぽんご한국어😀\uD83D\0\r\nenglish01234567890',
		ciphertext: '{"iter":200,"salt":"EUChaTc2I6nIdJPSVCe9YIKUSURd/W8jjX4yzcNvAus=","iv":"RPb1xewALYrPe0hM","ct":"HFEyN3KMsqf/EY2yTTKk0sBm34byHnmJVoL20v5GCuBdCJBl3w7NWoxKAcTD3D1jY3Rt3Brn1mJWykjJMDmPj6tjEyU8ZUS84TuLIW7MTcFOx5xM"}',
	},
	hexKey: {
		method: EncryptionMethod.KeyV1,
		password: '4BfJl8YbM,nXx.LVgs!AzkWWA]',
		plaintext: 'ea5d8dd43823a812c9a64f4eb09b57e1aa2dbfcda50bf9e416dcd1f8c569a6462f7f61861c3ccda0c7c16bf4192ed9c7ecaf3e1248517bd6f397d1080d2632fc69e1ead59a398a07e7478c8d90142745c0dce39c2105b6d34117424697de03879caa3b6410325f14dc5755b69efa944eb83f06970d04444e83fe054576af20576c0f3a5dc23e0d6dcfa3e84ec05c21139070c0809bd2bdc86a7782368c9d99eb072c858c61ec8926136e6e50dfd57b7e8e0084ad08b2d984db0436f50433cab44b3c462ccd22a8567c8ff86675fff618b11526030f09f735646a9f189f54ba5485d069ee25ac468ec0a873c1223eed34962bd219972020cc147041d4b00a3ab8',
		ciphertext: '{"iter":220000,"salt":"0J0KrV2DUWbbY/0T/Do8b2E0cQ2gOGUeVay/uRHnjhY=","iv":"4Z+V0Lh0ID5U7lzN","ct":"X+PZIHUmc3rCIq77fU3MNth2o2GrGd0jgl7P6xwXpK1qhkr/XLVZ5nx5Yo1DVMYivDeoVrPVmpZ9enQ3P667LtUjD2i/qJU0zxOcqdb2ZkAQssRPf7r+8yvhp6dK5d8zKB8gEKJK+z51vWyoEd9CE+NCUzPiNfrStRTuqDwxxXYiBE1gB4lzFWK1GLvfS4998g6rOjonn+SzuIc0JgSLrx9xoP4aVzolGAVRU6C9Hl37hSIudBUuUDskQcJao4BUQ25I5mQ27c9vISonHF2mqt0MbToVMTvYqDZFX48s9zdHlJ52fbgJnTlPD76OgbZEYeCMgPKge2Ic61nD+EYoacMWjS/+WncMbeVH3+5F0gg="}',
	},
	base64File: {
		method: EncryptionMethod.FileV1,
		password: '4BfJl8YbM,nXx.LVgs!AzkWWA]',
		plaintext: '5Lit5paH44Gr44Gj44G944KT44GU7ZWc6rWt7Ja08J+YgO+/vQANCmVuZ2xpc2gwMTIzNDU2Nzg5MA==',
		ciphertext: '{"iter":200,"salt":"bTlrtQiEzgOY2RRzolmGI360+/j4ZIqn5U5dstwDWsI=","iv":"8zWMrp+ebcVyZB2N","ct":"bNSj8GHcTflaq2WkXoJstvyDgoBZJbojVAahdyRRU3Kn+WzVoeKZTTmyH+pfLsKkkAqxpGUFpZWZM8eFXmxKN83jQBPjrJCdyFY="}',
	},
};

// cSpell:enable

// This can be used to run integration tests directly on device. It will throw
// an error if something cannot be decrypted, or else print info messages.
export const runIntegrationTests = async (silent = false, testPerformance = false) => {
	const log = (s: string) => {
		if (silent) return;
		// eslint-disable-next-line no-console
		console.info(s);
	};

	log('Crypto Tests: Running integration tests...');
	const encryptionEnabled = getEncryptionEnabled();
	setEncryptionEnabled(true);

	log('Crypto Tests: Decrypting using known data...');
	for (const testLabel in decryptTestData) {
		log(`Crypto Tests: Running decrypt test data case ${testLabel}...`);
		await checkDecryptTestData(decryptTestData[testLabel], { silent, testLabel, throwOnError: true });
	}

	log('Crypto Tests: Decrypting using local data...');
	const newData = await createDecryptTestData();
	await checkDecryptTestData(newData, { silent, throwOnError: true });

	// The performance test is very slow so it is disabled by default.
	if (testPerformance) {
		log('Crypto Tests: Testing performance...');
		if (shim.mobilePlatform() === '') {
			await testStringPerformance(65536, EncryptionMethod.StringV1, 100, 1000);
			await testStringPerformance(65536, EncryptionMethod.StringV1, 1000000, 10);
			await testStringPerformance(65536, EncryptionMethod.StringV1, 5000000, 10);
			await testStringPerformance(5000, EncryptionMethod.SJCL1a, 100, 1000);
			await testStringPerformance(5000, EncryptionMethod.SJCL1a, 1000000, 10);
			await testStringPerformance(5000, EncryptionMethod.SJCL1a, 5000000, 10);
			await testFilePerformance(65536, EncryptionMethod.FileV1, 100, 1000);
			await testFilePerformance(65536, EncryptionMethod.FileV1, 1000000, 3);
			await testFilePerformance(65536, EncryptionMethod.FileV1, 5000000, 3);
			await testFilePerformance(5000, EncryptionMethod.SJCL1a, 100, 1000);
			await testFilePerformance(5000, EncryptionMethod.SJCL1a, 1000000, 3);
			await testFilePerformance(5000, EncryptionMethod.SJCL1a, 5000000, 3);
		} else {
			await testStringPerformance(65536, EncryptionMethod.StringV1, 100, 100);
			await testStringPerformance(65536, EncryptionMethod.StringV1, 500000, 3);
			await testStringPerformance(65536, EncryptionMethod.StringV1, 1000000, 3);
			await testStringPerformance(5000, EncryptionMethod.SJCL1a, 100, 100);
			await testStringPerformance(5000, EncryptionMethod.SJCL1a, 500000, 3);
			await testStringPerformance(5000, EncryptionMethod.SJCL1a, 1000000, 3);
			await testFilePerformance(65536, EncryptionMethod.FileV1, 100, 100);
			await testFilePerformance(65536, EncryptionMethod.FileV1, 100000, 3);
			await testFilePerformance(65536, EncryptionMethod.FileV1, 500000, 3);
			await testFilePerformance(5000, EncryptionMethod.SJCL1a, 100, 100);
			await testFilePerformance(5000, EncryptionMethod.SJCL1a, 100000, 3);
			await testFilePerformance(5000, EncryptionMethod.SJCL1a, 500000, 3);
		}

	}

	setEncryptionEnabled(encryptionEnabled);
};
