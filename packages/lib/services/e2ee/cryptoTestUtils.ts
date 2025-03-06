import EncryptionService, { EncryptionMethod } from './EncryptionService';
import BaseItem from '../../models/BaseItem';
import Folder from '../../models/Folder';
import MasterKey from '../../models/MasterKey';
import Note from '../../models/Note';
import Setting from '../../models/Setting';
import shim from '../..//shim';
import { getEncryptionEnabled, setEncryptionEnabled } from '../synchronizer/syncInfoUtils';
import Logger from '@joplin/utils/Logger';

interface DecryptTestData {
	method: EncryptionMethod;
	password: string;
	plaintext: string;
	ciphertext: string;
}

let serviceInstance: EncryptionService = null;

const logger = Logger.create('Crypto Tests');

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
			messages.push('Data could not be decrypted');
			messages.push('Expected:', data.plaintext);
			messages.push('Got:', decrypted);
			hasError = true;
		} else {
			messages.push('Data could be decrypted');
		}
	} catch (error) {
		hasError = true;
		messages.push(`Failed to decrypt data: Error: ${error}`);
	}

	if (hasError && options.throwOnError) {
		const label = options.testLabel ? ` (test ${options.testLabel})` : '';
		throw new Error(`Testing Crypto failed${label}: \n${messages.join('\n')}`);
	} else {
		for (const msg of messages) {
			if (hasError) {
				logger.warn(msg);
			} else {
				if (!options.silent) logger.info(msg);
			}
		}
	}
}

export async function testStringPerformance(method: EncryptionMethod, dataSize: number, count: number, options: CheckTestDataOptions = null) {
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
			// eslint-disable-next-line no-unused-expressions -- Old code before rule was applied
			(decryptedNote.title === note.title);
			encryptTime += tick2 - tick1;
			decryptTime += tick3 - tick2;
		}

		messages.push(`testStringPerformance(): method: ${method}, count: ${count}, dataSize: ${dataSize}, encryptTime: ${encryptTime}, decryptTime: ${decryptTime}, encryptTime/count: ${encryptTime / count}, decryptTime/count: ${decryptTime / count}.`);

	} catch (error) {
		hasError = true;
		messages.push(`testStringPerformance() failed. Error: ${error}`);
	}

	if (hasError && options.throwOnError) {
		const label = options.testLabel ? ` (test ${options.testLabel})` : '';
		throw new Error(`Testing Crypto failed${label}: \n${messages.join('\n')}`);
	} else {
		for (const msg of messages) {
			if (hasError) {
				logger.warn(msg);
			} else {
				if (!options.silent) logger.info(msg);
			}
		}
	}
}

export async function testFilePerformance(method: EncryptionMethod, dataSize: number, count: number, options: CheckTestDataOptions = null) {
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

		messages.push(`testFilePerformance(): method: ${method}, count: ${count}, dataSize: ${dataSize}, encryptTime: ${encryptTime}, decryptTime: ${decryptTime}, encryptTime/count: ${encryptTime / count}, decryptTime/count: ${decryptTime / count}.`);

	} catch (error) {
		hasError = true;
		messages.push(`testFilePerformance() failed. Error: ${error}`);
	}

	if (hasError && options.throwOnError) {
		const label = options.testLabel ? ` (test ${options.testLabel})` : '';
		throw new Error(`Testing Crypto failed${label}: \n${messages.join('\n')}`);
	} else {
		for (const msg of messages) {
			if (hasError) {
				logger.warn(msg);
			} else {
				if (!options.silent) logger.info(msg);
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
		ciphertext: '{"salt":"6NKebMdcrFSGSzEWusbY8JUfG9rB98PxNZtk0QkYEFQ=","iv":"zHdXu8V5SYsO+vR/","ct":"4C3uyjOtRsNQZxCECvCeRaP+oPXMxjUMxsND67odnyiFg2A+fG6QW6O8axb6RHWU7QKHRG9/kHEs283DHL3hOAJbl4LS47R/dEDJbl8kWmGtLAsn"}',
	},
	hexKey: {
		method: EncryptionMethod.KeyV1,
		password: '4BfJl8YbM,nXx.LVgs!AzkWWA]',
		plaintext: 'ea5d8dd43823a812c9a64f4eb09b57e1aa2dbfcda50bf9e416dcd1f8c569a6462f7f61861c3ccda0c7c16bf4192ed9c7ecaf3e1248517bd6f397d1080d2632fc69e1ead59a398a07e7478c8d90142745c0dce39c2105b6d34117424697de03879caa3b6410325f14dc5755b69efa944eb83f06970d04444e83fe054576af20576c0f3a5dc23e0d6dcfa3e84ec05c21139070c0809bd2bdc86a7782368c9d99eb072c858c61ec8926136e6e50dfd57b7e8e0084ad08b2d984db0436f50433cab44b3c462ccd22a8567c8ff86675fff618b11526030f09f735646a9f189f54ba5485d069ee25ac468ec0a873c1223eed34962bd219972020cc147041d4b00a3ab8',
		ciphertext: '{"salt":"iv5kKP+scMyXKO2jqzef3q9y9p/o/mj6zAoKVltbPx0=","iv":"Gz1PtbDzoaZzRx5m","ct":"YSS4ga1Q0MeVpFbMn2V45TaAbbuJM12vU/qYQ/VEGYPXhNQ4YchfRt7+LjhVxwpvfc/rD0znt6kpAh4ROGS2CLDy27/n5VICgTVY2VVff+YjPAma6odKn2pm4Z88fZlkoJVLi7QyU96Mvb6bYVbuNjQ16hOjFQ3iIIztLcafsHaW6v6gUFrDWYVQPi1/xovmmCe/GaM3JeMye5QQiFrmLQIxEJMNv8YiNyppMVf5b1YGFtDlOjm3XE2H9bb+wWNAd82mcwcAe+ZUedz3AH9PKlsRyBGHfGQ/rfFzeoFj+Wjm4fvPniPa1muRSMQDHU2Zw5YGWQwMNVUHt+y7lDoqPF2NQv4DvPmY1kLz2yohIzc="}',
	},
	base64File: {
		method: EncryptionMethod.FileV1,
		password: '4BfJl8YbM,nXx.LVgs!AzkWWA]',
		plaintext: '5Lit5paH44Gr44Gj44G944KT44GU7ZWc6rWt7Ja08J+YgO+/vQANCmVuZ2xpc2gwMTIzNDU2Nzg5MA==',
		ciphertext: '{"salt":"19Zx/+hxpZ+Trc7MGBt837SsTOJjHe9aiY5UPnXP6Oo=","iv":"N4PTzsyh4wONNJWa","ct":"LxAibOnVox1q2WBtLAKxeZxIIxKOEd6xdD3NKAn5mgHhv4i60yPiyPbr8rS+MzHmeq7Z3BhHjR7540rtdeBugbmf1+b3tYuRudI="}',
	},
};

// cSpell:enable

// This can be used to run integration tests directly on device. It will throw
// an error if something cannot be decrypted, or else print info messages.
export const runIntegrationTests = async (silent = false, testPerformance = false) => {
	const log = (s: string) => {
		if (silent) return;
		logger.info(s);
	};

	log('Running integration tests...');
	const encryptionEnabled = getEncryptionEnabled();
	serviceInstance = EncryptionService.instance();
	BaseItem.encryptionService_ = EncryptionService.instance();
	setEncryptionEnabled(true);

	log('Decrypting using known data...');
	for (const testLabel in decryptTestData) {
		log(`Running decrypt test data case ${testLabel}...`);
		await checkDecryptTestData(decryptTestData[testLabel], { silent, testLabel, throwOnError: true });
	}

	log('Decrypting using local data...');
	const newData = await createDecryptTestData();
	await checkDecryptTestData(newData, { silent, throwOnError: true });

	// The performance test is very slow so it is disabled by default.
	if (testPerformance) {
		log('Testing performance...');
		if (shim.mobilePlatform() === '') {
			await testStringPerformance(EncryptionMethod.StringV1, 100, 1000);
			await testStringPerformance(EncryptionMethod.StringV1, 1000000, 10);
			await testStringPerformance(EncryptionMethod.StringV1, 5000000, 10);
			await testStringPerformance(EncryptionMethod.SJCL1a, 100, 1000);
			await testStringPerformance(EncryptionMethod.SJCL1a, 1000000, 10);
			await testStringPerformance(EncryptionMethod.SJCL1a, 5000000, 10);
			await testFilePerformance(EncryptionMethod.FileV1, 100, 1000);
			await testFilePerformance(EncryptionMethod.FileV1, 1000000, 3);
			await testFilePerformance(EncryptionMethod.FileV1, 5000000, 3);
			await testFilePerformance(EncryptionMethod.SJCL1a, 100, 1000);
			await testFilePerformance(EncryptionMethod.SJCL1a, 1000000, 3);
			await testFilePerformance(EncryptionMethod.SJCL1a, 5000000, 3);
		} else {
			await testStringPerformance(EncryptionMethod.StringV1, 100, 100);
			await testStringPerformance(EncryptionMethod.StringV1, 500000, 3);
			await testStringPerformance(EncryptionMethod.StringV1, 1000000, 3);
			await testStringPerformance(EncryptionMethod.SJCL1a, 100, 100);
			await testStringPerformance(EncryptionMethod.SJCL1a, 500000, 3);
			await testStringPerformance(EncryptionMethod.SJCL1a, 1000000, 3);
			await testFilePerformance(EncryptionMethod.FileV1, 100, 100);
			await testFilePerformance(EncryptionMethod.FileV1, 100000, 3);
			await testFilePerformance(EncryptionMethod.FileV1, 500000, 3);
			await testFilePerformance(EncryptionMethod.SJCL1a, 100, 100);
			await testFilePerformance(EncryptionMethod.SJCL1a, 100000, 3);
			await testFilePerformance(EncryptionMethod.SJCL1a, 500000, 3);
		}

	}

	setEncryptionEnabled(encryptionEnabled);
};
