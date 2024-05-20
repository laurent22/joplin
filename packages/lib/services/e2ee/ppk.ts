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
	keySize: number;
	publicKey: PublicKey;
	privateKey: PrivateKey;
	createdTime: number;
}

let rsa_: RSA = null;

export const setRSA = (rsa: RSA) => {
	rsa_ = rsa;
};

export const rsa = (): RSA => {
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
	const keySize = 2048;
	const keyPair = await rsa().generateKeyPair(keySize);

	return {
		id: uuid.createNano(),
		keySize,
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
	return rsa().loadKeys(ppk.publicKey, privateKeyPlainText, ppk.keySize);
}

async function loadPublicKey(publicKey: PublicKey, keySize: number): Promise<RSAKeyPair> {
	return rsa().loadKeys(publicKey, '', keySize);
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
	const loadedPublicKey = await loadPublicKey(encryptionPublicKey.publicKey, encryptionPublicKey.keySize);
	const encryptionHandler = ppkEncryptionHandler(encryptionPublicKey.id, loadedPublicKey);

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
