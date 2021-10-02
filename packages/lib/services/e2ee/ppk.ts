import uuid from '../../uuid';
import EncryptionService, { EncryptionCustomHandler, EncryptionMethod } from './EncryptionService';
import { MasterKeyEntity, RSA, RSAKeyPair } from './types';

interface PrivateKey {
	encryptionMethod: EncryptionMethod;
	ciphertext: string;
}

export type PublicKey = string;

export interface PublicPrivateKeyPair {
	id: string;
	publicKey: PublicKey;
	privateKey: PrivateKey;
	createdTime: number;
}

let rsa_: RSA = null;

export const setRSA = (rsa: RSA) => {
	rsa_ = rsa;
};

const rsa = (): RSA => {
	if (!rsa_) throw new Error('RSA handler has not been set!!');
	return rsa_;
};

async function encryptPrivateKey(encryptionService: EncryptionService, password: string, plainText: string): Promise<PrivateKey> {
	return {
		encryptionMethod: EncryptionMethod.SJCL4,
		ciphertext: await encryptionService.encrypt(EncryptionMethod.SJCL4, password, plainText),
	};
}

export async function decryptPrivateKey(encryptionService: EncryptionService, encryptedKey: PrivateKey, password: string): Promise<string> {
	return encryptionService.decrypt(encryptedKey.encryptionMethod, password, encryptedKey.ciphertext);
}

export async function generateKeyPair(encryptionService: EncryptionService, password: string): Promise<PublicPrivateKeyPair> {
	const keyPair = await rsa().generateKeyPair(2048);

	return {
		id: uuid.createNano(),
		privateKey: await encryptPrivateKey(encryptionService, password, rsa().privateKey(keyPair)),
		publicKey: rsa().publicKey(keyPair),
		createdTime: Date.now(),
	};
}

export async function pkReencryptPrivateKey(encryptionService: EncryptionService, ppk: PublicPrivateKeyPair, decryptionPassword: string, encryptionPassword: string): Promise<PublicPrivateKeyPair> {
	const decryptedPrivate = await decryptPrivateKey(encryptionService, ppk.privateKey, decryptionPassword);

	return {
		...ppk,
		privateKey: await encryptPrivateKey(encryptionService, encryptionPassword, decryptedPrivate),
	};
}

export async function ppkPasswordIsValid(service: EncryptionService, ppk: PublicPrivateKeyPair, password: string): Promise<boolean> {
	if (!ppk) throw new Error('PPK is undefined');

	try {
		await loadPpk(service, ppk, password);
	} catch (error) {
		return false;
	}

	return true;
}

async function loadPpk(service: EncryptionService, ppk: PublicPrivateKeyPair, password: string): Promise<RSAKeyPair> {
	const privateKeyPlainText = await decryptPrivateKey(service, ppk.privateKey, password);
	return rsa().loadKeys(ppk.publicKey, privateKeyPlainText);
}

async function loadPublicKey(publicKey: PublicKey): Promise<RSAKeyPair> {
	return rsa().loadKeys(publicKey, '');
}

function ppkEncryptionHandler(ppkId: string, rsaKeyPair: RSAKeyPair): EncryptionCustomHandler {
	interface Context {
		rsaKeyPair: RSAKeyPair;
		ppkId: string;
	}

	return {
		context: {
			rsaKeyPair,
			ppkId,
		},
		encrypt: async (context: Context, hexaBytes: string, _password: string): Promise<string> => {
			return JSON.stringify({
				ppkId: context.ppkId,
				ciphertext: await rsa().encrypt(hexaBytes, context.rsaKeyPair),
			});
		},
		decrypt: async (context: Context, ciphertext: string, _password: string): Promise<string> => {
			const parsed = JSON.parse(ciphertext);
			if (parsed.ppkId !== context.ppkId) throw new Error(`Needs private key ${parsed.ppkId} to decrypt, but using ${context.ppkId}`);
			return rsa().decrypt(parsed.ciphertext, context.rsaKeyPair);
		},
	};
}

// Generates a master key and encrypts it using the provided PPK
export async function ppkGenerateMasterKey(service: EncryptionService, ppk: PublicPrivateKeyPair, password: string): Promise<MasterKeyEntity> {
	const nodeRSA = await loadPpk(service, ppk, password);
	const handler = ppkEncryptionHandler(ppk.id, nodeRSA);

	return service.generateMasterKey('', {
		encryptionMethod: EncryptionMethod.Custom,
		encryptionHandler: handler,
	});
}

// Decrypt the content of a master key that was encrypted using ppkGenerateMasterKey()
export async function ppkDecryptMasterKeyContent(service: EncryptionService, masterKey: MasterKeyEntity, ppk: PublicPrivateKeyPair, password: string): Promise<string> {
	const nodeRSA = await loadPpk(service, ppk, password);
	const handler = ppkEncryptionHandler(ppk.id, nodeRSA);

	return service.decryptMasterKeyContent(masterKey, '', {
		encryptionHandler: handler,
	});
}

export async function mkReencryptFromPasswordToPublicKey(service: EncryptionService, masterKey: MasterKeyEntity, decryptionPassword: string, encryptionPublicKey: PublicPrivateKeyPair): Promise<MasterKeyEntity> {
	const encryptionHandler = ppkEncryptionHandler(encryptionPublicKey.id, await loadPublicKey(encryptionPublicKey.publicKey));

	const plainText = await service.decryptMasterKeyContent(masterKey, decryptionPassword);
	const newContent = await service.encryptMasterKeyContent(EncryptionMethod.Custom, plainText, '', { encryptionHandler });

	return { ...masterKey, ...newContent };
}

export async function mkReencryptFromPublicKeyToPassword(service: EncryptionService, masterKey: MasterKeyEntity, decryptionPpk: PublicPrivateKeyPair, decryptionPassword: string, encryptionPassword: string): Promise<MasterKeyEntity> {
	const decryptionHandler = ppkEncryptionHandler(decryptionPpk.id, await loadPpk(service, decryptionPpk, decryptionPassword));

	const plainText = await service.decryptMasterKeyContent(masterKey, '', { encryptionHandler: decryptionHandler });
	const newContent = await service.encryptMasterKeyContent(null, plainText, encryptionPassword);

	return { ...masterKey, ...newContent };
}

interface TestData {
	publicKey: string;
	privateKey: string;
	plaintext: string;
	ciphertext: string;
}

// This is conveninent to quickly generate some data to verify for example that
// react-native-rsa can decrypt data from node-rsa and vice-versa.
export async function createTestData() {
	const plaintext = 'just testing';
	const keyPair = await rsa().generateKeyPair(2048);
	const ciphertext = await rsa().encrypt(plaintext, keyPair);

	return {
		publicKey: rsa().publicKey(keyPair),
		privateKey: rsa().privateKey(keyPair),
		plaintext,
		ciphertext,
	};
}

export async function printTestData() {
	console.info(JSON.stringify(await createTestData(), null, '\t'));
}

export async function checkTestData(data: TestData) {
	// First verify that the data coming from the other app can be decrypted.

	const keyPair = await rsa().loadKeys(data.publicKey, data.privateKey);
	const decrypted = await rsa().decrypt(data.ciphertext, keyPair);
	if (decrypted !== data.plaintext) {
		console.warn('ERROR: Data could not be decrypted');
		console.warn('EXPECTED:', data.plaintext);
		console.warn('GOT:', decrypted);
	} else {
		console.warn('OK: Data could be decrypted');
	}

	// Then check that the public key can be used to encrypt new data, and then
	// decrypt it with the private key.

	{
		const encrypted = await rsa().encrypt('something else', keyPair);
		const decrypted = await rsa().decrypt(encrypted, keyPair);
		if (decrypted !== 'something else') {
			console.warn('ERROR: Data could not be encrypted, then decrypted');
			console.warn('EXPECTED:', 'something else');
			console.warn('GOT:', decrypted);
		} else {
			console.warn('OK: Data could be encrypted then decrypted');
		}
	}
}
