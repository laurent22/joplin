import * as NodeRSA from 'node-rsa';
import Setting from '../../models/Setting';
import uuid from '../../uuid';
import { getActiveMasterKey, SyncInfo } from '../synchronizer/syncInfoUtils';
import EncryptionService, { EncryptionCustomHandler, EncryptionMethod } from './EncryptionService';
import { MasterKeyEntity } from './types';

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

async function encryptPrivateKey(encryptionService: EncryptionService, password: string, plainText: string): Promise<PrivateKey> {
	return {
		encryptionMethod: EncryptionMethod.SJCL4,
		ciphertext: await encryptionService.encrypt(EncryptionMethod.SJCL4, password, plainText),
	};
}

export async function decryptPrivateKey(encryptionService: EncryptionService, encryptedKey: PrivateKey, password: string): Promise<string> {
	return encryptionService.decrypt(encryptedKey.encryptionMethod, password, encryptedKey.ciphertext);
}

const nodeRSAEncryptionScheme = 'pkcs1_oaep';

function nodeRSAOptions(): NodeRSA.Options {
	return {
		encryptionScheme: nodeRSAEncryptionScheme,
	};
}

export async function generateKeyPair(encryptionService: EncryptionService, password: string): Promise<PublicPrivateKeyPair> {
	const keys = new NodeRSA();
	keys.setOptions(nodeRSAOptions());
	keys.generateKeyPair(2048, 65537);

	// Sanity check
	if (!keys.isPrivate()) throw new Error('No private key was generated');
	if (!keys.isPublic()) throw new Error('No public key was generated');

	return {
		id: uuid.createNano(),
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

	passwords[localInfo.ppk.id] = password;
	Setting.setValue('encryption.passwordCache', passwords);
	await Setting.saveAll();
}

async function loadPpk(service: EncryptionService, ppk: PublicPrivateKeyPair, password: string): Promise<NodeRSA> {
	const keys = new NodeRSA();
	keys.setOptions(nodeRSAOptions());
	keys.importKey(ppk.publicKey, 'pkcs1-public-pem');
	keys.importKey(await decryptPrivateKey(service, ppk.privateKey, password), 'pkcs1-private-pem');
	return keys;
}

export function ppkEncryptionHandler(nodeRSA: NodeRSA): EncryptionCustomHandler {
	return {
		context: {
			nodeRSA,
		},
		encrypt: async (context: any, hexaBytes: string, _password: string): Promise<string> => {
			return JSON.stringify({
				scheme: nodeRSAEncryptionScheme,
				ciphertext: context.nodeRSA.encrypt(hexaBytes, 'hex'),
			});
		},
		decrypt: async (context: any, ciphertext: string, _password: string): Promise<string> => {
			const parsed = JSON.parse(ciphertext);
			return context.nodeRSA.decrypt(Buffer.from(parsed.ciphertext, 'hex'), 'utf8');
		},
	};
}

// Generates a master key and encrypts it using the provided PPK
export async function ppkGenerateMasterKey(service: EncryptionService, ppk: PublicPrivateKeyPair, password: string): Promise<MasterKeyEntity> {
	const nodeRSA = await loadPpk(service, ppk, password);
	const handler = ppkEncryptionHandler(nodeRSA);

	return service.generateMasterKey('', {
		encryptionMethod: EncryptionMethod.Custom,
		encryptionHandler: handler,
	});
}

// Decrypt the content of a master key that was encrypted using ppkGenerateMasterKey()
export async function ppkDecryptMasterKeyContent(service: EncryptionService, masterKey: MasterKeyEntity, ppk: PublicPrivateKeyPair, password: string): Promise<string> {
	const nodeRSA = await loadPpk(service, ppk, password);
	const handler = ppkEncryptionHandler(nodeRSA);

	return service.decryptMasterKeyContent(masterKey, '', {
		encryptionHandler: handler,
	});
}
