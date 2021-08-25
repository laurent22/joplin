import * as NodeRSA from 'node-rsa';
import Setting from '../../models/Setting';
import { getActiveMasterKey, SyncInfo } from '../synchronizer/syncInfoUtils';
import EncryptionService, { EncryptionMethod } from './EncryptionService';

interface PrivateKey {
	encryptionMethod: EncryptionMethod;
	ciphertext: string;
}

export type PublicKey = string;

export interface PublicPrivateKeyPair {
	publicKey: PublicKey;
	privateKey: PrivateKey;
	createdTime: number;
}

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
	const keys = new NodeRSA();
	keys.generateKeyPair(2048, 65537);

	// Sanity check
	if (!keys.isPrivate()) throw new Error('No private key was generated');
	if (!keys.isPublic()) throw new Error('No public key was generated');

	return {
		privateKey: await encryptPrivateKey(encryptionService, password, keys.exportKey('pkcs1-private-pem')),
		publicKey: keys.exportKey('pkcs1-public-pem'),
		createdTime: Date.now(),
	};
}

export async function setPpkIfNotExist(service: EncryptionService, localInfo: SyncInfo, remoteInfo: SyncInfo) {
	if (localInfo.ppk || remoteInfo.ppk) return;

	const masterKey = getActiveMasterKey(localInfo);
	if (!masterKey) return;

	const passwords = Setting.value('encryption.passwordCache');
	const password = passwords[masterKey.id];
	if (!password) return;

	localInfo.ppk = await generateKeyPair(service, password);
}
