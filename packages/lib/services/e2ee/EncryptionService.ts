import { CipherAlgorithm, Digest, MasterKeyEntity } from './types';
import Logger from '@joplin/utils/Logger';
import shim from '../../shim';
import Setting from '../../models/Setting';
import MasterKey from '../../models/MasterKey';
import BaseItem from '../../models/BaseItem';
import JoplinError from '../../JoplinError';
import { getActiveMasterKeyId, setActiveMasterKeyId } from '../synchronizer/syncInfoUtils';
const { padLeft } = require('../../string-utils.js');

const logger = Logger.create('EncryptionService');

const emptyUint8Array = new Uint8Array(0);

function hexPad(s: string, length: number) {
	return padLeft(s, length, '0');
}

export function isValidHeaderIdentifier(id: string, ignoreTooLongLength = false) {
	if (!id) return false;
	if (!ignoreTooLongLength && id.length !== 5) return false;
	return /JED\d\d/.test(id);
}

interface DecryptedMasterKey {
	updatedTime: number;
	plainText: string;
}

export interface EncryptionCustomHandler {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	context?: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	encrypt(context: any, hexaBytes: string, password: string): Promise<string>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	decrypt(context: any, hexaBytes: string, password: string): Promise<string>;
}

export enum EncryptionMethod {
	SJCL = 1,
	SJCL2 = 2,
	SJCL3 = 3,
	SJCL4 = 4,
	SJCL1a = 5,
	Custom = 6,
	SJCL1b = 7,
	KeyV1 = 8,
	FileV1 = 9,
	StringV1 = 10,
}

export interface EncryptOptions {
	encryptionMethod?: EncryptionMethod;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onProgress?: Function;
	encryptionHandler?: EncryptionCustomHandler;
	masterKeyId?: string;
}

type GetPasswordCallback = ()=> string|Promise<string>;
interface EncryptedMasterKey {
	updatedTime: number;
	decrypt: ()=> Promise<void>;
}

export default class EncryptionService {

	public static instance_: EncryptionService = null;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static fsDriver_: any = null;

	private encryptedMasterKeys_: Map<string, EncryptedMasterKey> = new Map();
	private decryptedMasterKeys_: Map<string, DecryptedMasterKey> = new Map();
	public defaultEncryptionMethod_ = Setting.value('featureFlag.useBetaEncryptionMethod') ? EncryptionMethod.StringV1 : EncryptionMethod.SJCL1a; // public because used in tests
	public defaultFileEncryptionMethod_ = Setting.value('featureFlag.useBetaEncryptionMethod') ? EncryptionMethod.FileV1 : EncryptionMethod.SJCL1a; // public because used in tests
	private defaultMasterKeyEncryptionMethod_ = Setting.value('featureFlag.useBetaEncryptionMethod') ? EncryptionMethod.KeyV1 : EncryptionMethod.SJCL4;

	private encryptionNonce_: Uint8Array = null;

	private headerTemplates_ = {
		// Template version 1
		1: {
			// Fields are defined as [name, valueSize, valueType]
			fields: [['encryptionMethod', 2, 'int'], ['masterKeyId', 32, 'hex']],
		},
	};

	public constructor() {
		const crypto = shim.crypto;
		crypto.generateNonce(new Uint8Array(36))
			// eslint-disable-next-line promise/prefer-await-to-then
			.then((nonce) => this.encryptionNonce_ = nonce)
			// eslint-disable-next-line promise/prefer-await-to-then
			.catch((error) => logger.error(error));
	}

	public static instance() {
		if (this.instance_) return this.instance_;
		this.instance_ = new EncryptionService();
		return this.instance_;
	}

	public get defaultMasterKeyEncryptionMethod() {
		return this.defaultMasterKeyEncryptionMethod_;
	}

	public loadedMasterKeysCount() {
		return this.loadedMasterKeyIds().length;
	}

	// Note for methods using SJCL:
	//
	// 1 MB is very slow with Node and probably even worse on mobile.
	//
	// On mobile the time it takes to decrypt increases exponentially for some reason, so it's important
	// to have a relatively small size so as not to freeze the app. For example, on Android 7.1 simulator
	// with 4.1 GB RAM, it takes this much to decrypt a block;
	//
	// 50KB => 1000 ms
	// 25KB => 250ms
	// 10KB => 200ms
	// 5KB => 10ms
	//
	// So making the block 10 times smaller make it 100 times faster! So for now using 5KB. This can be
	// changed easily since the chunk size is incorporated into the encrypted data.
	public chunkSize(method: EncryptionMethod) {
		type EncryptionMethodChunkSizeMap = Record<EncryptionMethod, number>;
		const encryptionMethodChunkSizeMap: EncryptionMethodChunkSizeMap = {
			[EncryptionMethod.SJCL]: 5000,
			[EncryptionMethod.SJCL1a]: 5000,
			[EncryptionMethod.SJCL1b]: 5000,
			[EncryptionMethod.SJCL2]: 5000,
			[EncryptionMethod.SJCL3]: 5000,
			[EncryptionMethod.SJCL4]: 5000,
			[EncryptionMethod.Custom]: 5000,
			[EncryptionMethod.KeyV1]: 5000, // Master key is not encrypted by chunks so this value will not be used.
			[EncryptionMethod.FileV1]: 131072, // 128k
			[EncryptionMethod.StringV1]: 65536, // 64k
		};

		return encryptionMethodChunkSizeMap[method];
	}

	public defaultEncryptionMethod() {
		return this.defaultEncryptionMethod_;
	}

	public defaultFileEncryptionMethod() {
		return this.defaultFileEncryptionMethod_;
	}

	public setActiveMasterKeyId(id: string) {
		setActiveMasterKeyId(id);
	}

	public activeMasterKeyId() {
		const id = getActiveMasterKeyId();
		if (!id) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const error: any = new Error('No master key is defined as active. Check this: Either one or more master keys exist but no password was provided for any of them. Or no master key exist. Or master keys and password exist, but none was set as active.');
			error.code = 'noActiveMasterKey';
			throw error;
		}
		return id;
	}

	public isMasterKeyLoaded(masterKey: MasterKeyEntity) {
		if (this.encryptedMasterKeys_.get(masterKey.id)) {
			return true;
		}
		const d = this.decryptedMasterKeys_.get(masterKey.id);
		if (!d) return false;
		return d.updatedTime === masterKey.updated_time;
	}

	public async loadMasterKey(model: MasterKeyEntity, getPassword: string|GetPasswordCallback, makeActive = false) {
		if (!model.id) throw new Error('Master key does not have an ID - save it first');

		const loadKey = async () => {
			logger.info(`Loading master key: ${model.id}. Make active:`, makeActive);

			const password = typeof getPassword === 'string' ? getPassword : (await getPassword());
			if (!password) {
				logger.info(`Loading master key ${model.id} failed. No valid password found.`);
			} else {
				try {
					this.decryptedMasterKeys_.set(model.id, {
						plainText: await this.decryptMasterKeyContent(model, password),
						updatedTime: model.updated_time,
					});

					if (makeActive) this.setActiveMasterKeyId(model.id);
				} catch (error) {
					logger.warn(`Cannot load master key ${model.id}. Invalid password?`, error);
				}
			}

			this.encryptedMasterKeys_.delete(model.id);
		};

		if (!makeActive) {
			this.encryptedMasterKeys_.set(model.id, {
				decrypt: loadKey,
				updatedTime: model.updated_time,
			});
		} else {
			await loadKey();
		}
	}

	public unloadMasterKey(model: MasterKeyEntity) {
		this.decryptedMasterKeys_.delete(model.id);
		this.encryptedMasterKeys_.delete(model.id);
	}

	public async loadedMasterKey(id: string) {
		const cachedKey = this.decryptedMasterKeys_.get(id);
		if (cachedKey) return cachedKey;

		const decryptCallback = this.encryptedMasterKeys_.get(id);
		if (decryptCallback) {
			// TODO: Handle invalid password errors?
			await decryptCallback.decrypt();
		}

		const key = this.decryptedMasterKeys_.get(id);

		if (!key) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const error: any = new Error(`Master key is not loaded: ${id}`);
			error.code = 'masterKeyNotLoaded';
			error.masterKeyId = id;
			throw error;
		}
		return key;
	}

	public loadedMasterKeyIds() {
		return [...this.decryptedMasterKeys_.keys(), ...this.encryptedMasterKeys_.keys()];
	}

	public fsDriver() {
		if (!EncryptionService.fsDriver_) throw new Error('EncryptionService.fsDriver_ not set!');
		return EncryptionService.fsDriver_;
	}

	public sha256(string: string) {
		const sjcl = shim.sjclModule;
		const bitArray = sjcl.hash.sha256.hash(string);
		return sjcl.codec.hex.fromBits(bitArray);
	}

	public async generateApiToken() {
		return await this.randomHexString(64);
	}

	private async randomHexString(byteCount: number) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const bytes: any[] = await shim.randomBytes(byteCount);
		return bytes
			.map(a => {
				return hexPad(a.toString(16), 2);
			})
			.join('');
	}

	public masterKeysThatNeedUpgrading(masterKeys: MasterKeyEntity[]) {
		return MasterKey.allWithoutEncryptionMethod(masterKeys, [this.defaultMasterKeyEncryptionMethod_, EncryptionMethod.Custom]);
	}

	public async reencryptMasterKey(model: MasterKeyEntity, decryptionPassword: string, encryptionPassword: string, decryptOptions: EncryptOptions = null, encryptOptions: EncryptOptions = null): Promise<MasterKeyEntity> {
		const newEncryptionMethod = this.defaultMasterKeyEncryptionMethod_;
		const plainText = await this.decryptMasterKeyContent(model, decryptionPassword, decryptOptions);
		const newContent = await this.encryptMasterKeyContent(newEncryptionMethod, plainText, encryptionPassword, encryptOptions);
		return { ...model, ...newContent };
	}

	public async encryptMasterKeyContent(encryptionMethod: EncryptionMethod, hexaBytes: string, password: string, options: EncryptOptions = null): Promise<MasterKeyEntity> {
		options = { ...options };

		if (encryptionMethod === null) encryptionMethod = this.defaultMasterKeyEncryptionMethod_;

		if (options.encryptionHandler) {
			return {
				checksum: '',
				encryption_method: EncryptionMethod.Custom,
				content: await options.encryptionHandler.encrypt(options.encryptionHandler.context, hexaBytes, password),
			};
		} else {
			return {
				// Checksum is not necessary since decryption will already fail if data is invalid
				checksum: encryptionMethod === EncryptionMethod.SJCL2 ? this.sha256(hexaBytes) : '',
				encryption_method: encryptionMethod,
				content: await this.encrypt(encryptionMethod, password, hexaBytes),
			};
		}
	}

	private async generateMasterKeyContent_(password: string, options: EncryptOptions = null) {
		options = { encryptionMethod: this.defaultMasterKeyEncryptionMethod_, ...options };

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const bytes: any[] = await shim.randomBytes(256);
		const hexaBytes = bytes.map(a => hexPad(a.toString(16), 2)).join('');

		return this.encryptMasterKeyContent(options.encryptionMethod, hexaBytes, password, options);
	}

	public async generateMasterKey(password: string, options: EncryptOptions = null) {
		const model = await this.generateMasterKeyContent_(password, options);

		const now = Date.now();
		model.created_time = now;
		model.updated_time = now;
		model.source_application = Setting.value('appId');
		model.hasBeenUsed = false;

		return model;
	}

	public async decryptMasterKeyContent(model: MasterKeyEntity, password: string, options: EncryptOptions = null): Promise<string> {
		options = options || {};

		if (model.encryption_method === EncryptionMethod.Custom) {
			if (!options.encryptionHandler) throw new Error('Master key was encrypted using a custom method, but no encryptionHandler is provided');
			return options.encryptionHandler.decrypt(options.encryptionHandler.context, model.content, password);
		}

		const plainText = await this.decrypt(model.encryption_method, password, model.content);
		if (model.encryption_method === EncryptionMethod.SJCL2) {
			const checksum = this.sha256(plainText);
			if (checksum !== model.checksum) throw new Error('Could not decrypt master key (checksum failed)');
		}

		return plainText;
	}

	public async checkMasterKeyPassword(model: MasterKeyEntity, password: string) {
		try {
			await this.decryptMasterKeyContent(model, password);
		} catch (error) {
			return false;
		}

		return true;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private wrapSjclError(sjclError: any) {
		const error = new Error(sjclError.message);
		error.stack = sjclError.stack;
		return error;
	}

	public async encrypt(method: EncryptionMethod, key: string, plainText: string): Promise<string> {
		if (!method) throw new Error('Encryption method is required');
		if (!key) throw new Error('Encryption key is required');

		const sjcl = shim.sjclModule;
		const crypto = shim.crypto;

		type EncryptionMethodHandler = (()=> Promise<string>);
		const handlers: Record<EncryptionMethod, EncryptionMethodHandler> = {
			// 2020-01-23: Deprecated and no longer secure due to the use og OCB2 mode - do not use.
			[EncryptionMethod.SJCL]: () => {
				try {
					// Good demo to understand each parameter: https://bitwiseshiftleft.github.io/sjcl/demo/
					return sjcl.json.encrypt(key, plainText, {
						v: 1, // version
						iter: 1000, // Defaults to 1000 in sjcl but since we're running this on mobile devices, use a lower value. Maybe review this after some time. https://security.stackexchange.com/questions/3959/recommended-of-iterations-when-using-pkbdf2-sha256
						ks: 128, // Key size - "128 bits should be secure enough"
						ts: 64, // ???
						mode: 'ocb2', //  The cipher mode is a standard for how to use AES and other algorithms to encrypt and authenticate your message. OCB2 mode is slightly faster and has more features, but CCM mode has wider support because it is not patented.
						// "adata":"", // Associated Data - not needed?
						cipher: 'aes',
					});
				} catch (error) {
					throw this.wrapSjclError(error);
				}
			},

			// 2020-03-06: Added method to fix https://github.com/laurent22/joplin/issues/2591
			//             Also took the opportunity to change number of key derivations, per Isaac Potoczny's suggestion
			// 2023-06-10: Deprecated in favour of SJCL1b
			[EncryptionMethod.SJCL1a]: () => {
				try {
					// We need to escape the data because SJCL uses encodeURIComponent to process the data and it only
					// accepts UTF-8 data, or else it throws an error. And the notes might occasionally contain
					// invalid UTF-8 data. Fixes https://github.com/laurent22/joplin/issues/2591
					return sjcl.json.encrypt(key, escape(plainText), {
						v: 1, // version
						iter: 101, // Since the master key already uses key derivations and is secure, additional iteration here aren't necessary, which will make decryption faster. SJCL enforces an iter strictly greater than 100
						ks: 128, // Key size - "128 bits should be secure enough"
						ts: 64, // ???
						mode: 'ccm', //  The cipher mode is a standard for how to use AES and other algorithms to encrypt and authenticate your message. OCB2 mode is slightly faster and has more features, but CCM mode has wider support because it is not patented.
						// "adata":"", // Associated Data - not needed?
						cipher: 'aes',
					});
				} catch (error) {
					throw this.wrapSjclError(error);
				}
			},

			// 2023-06-10: Changed AES-128 to AES-256 per TheQuantumPhysicist's suggestions
			// https://github.com/laurent22/joplin/issues/7686
			[EncryptionMethod.SJCL1b]: () => {
				try {
					// We need to escape the data because SJCL uses encodeURIComponent to process the data and it only
					// accepts UTF-8 data, or else it throws an error. And the notes might occasionally contain
					// invalid UTF-8 data. Fixes https://github.com/laurent22/joplin/issues/2591
					return sjcl.json.encrypt(key, escape(plainText), {
						v: 1, // version
						iter: 101, // Since the master key already uses key derivations and is secure, additional iteration here aren't necessary, which will make decryption faster. SJCL enforces an iter strictly greater than 100
						ks: 256, // Key size - "256-bit is the golden standard that we should follow."
						ts: 64, // ???
						mode: 'ccm', //  The cipher mode is a standard for how to use AES and other algorithms to encrypt and authenticate your message. OCB2 mode is slightly faster and has more features, but CCM mode has wider support because it is not patented.
						// "adata":"", // Associated Data - not needed?
						cipher: 'aes',
					});
				} catch (error) {
					throw this.wrapSjclError(error);
				}
			},

			// 2020-01-23: Deprecated - see above.
			// Was used to encrypt master keys
			[EncryptionMethod.SJCL2]: () => {
				try {
					return sjcl.json.encrypt(key, plainText, {
						v: 1,
						iter: 10000,
						ks: 256,
						ts: 64,
						mode: 'ocb2',
						cipher: 'aes',
					});
				} catch (error) {
					throw this.wrapSjclError(error);
				}
			},

			// Don't know why we have this - it's not used anywhere. It must be
			// kept however, in case some note somewhere is encrypted using this
			// method.
			[EncryptionMethod.SJCL3]: () => {
				try {
					// Good demo to understand each parameter: https://bitwiseshiftleft.github.io/sjcl/demo/
					return sjcl.json.encrypt(key, plainText, {
						v: 1, // version
						iter: 1000, // Defaults to 1000 in sjcl. Since we're running this on mobile devices we need to be careful it doesn't affect performances too much. Maybe review this after some time. https://security.stackexchange.com/questions/3959/recommended-of-iterations-when-using-pkbdf2-sha256
						ks: 128, // Key size - "128 bits should be secure enough"
						ts: 64, // ???
						mode: 'ccm', //  The cipher mode is a standard for how to use AES and other algorithms to encrypt and authenticate your message. OCB2 mode is slightly faster and has more features, but CCM mode has wider support because it is not patented.
						// "adata":"", // Associated Data - not needed?
						cipher: 'aes',
					});
				} catch (error) {
					throw this.wrapSjclError(error);
				}
			},

			// Same as above but more secure (but slower) to encrypt master keys
			[EncryptionMethod.SJCL4]: () => {
				try {
					return sjcl.json.encrypt(key, plainText, {
						v: 1,
						iter: 10000,
						ks: 256,
						ts: 64,
						mode: 'ccm',
						cipher: 'aes',
					});
				} catch (error) {
					throw this.wrapSjclError(error);
				}
			},

			// New encryption method powered by native crypto libraries(node:crypto/react-native-quick-crypto). Using AES-256-GCM and pbkdf2
			// The master key is not directly used. A new data key is generated from the master key and a 256 bits random salt to prevent nonce reuse problem
			// 2024-08: Set iteration count in pbkdf2 to 220000 as suggested by OWASP. https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#pbkdf2
			[EncryptionMethod.KeyV1]: async () => {
				return JSON.stringify(await crypto.encryptString(key, await crypto.digest(Digest.sha256, this.encryptionNonce_), plainText, 'hex', {
					cipherAlgorithm: CipherAlgorithm.AES_256_GCM,
					authTagLength: 16,
					digestAlgorithm: Digest.sha512,
					keyLength: 32,
					associatedData: emptyUint8Array,
					iterationCount: 220000,
				}));
			},

			// New encryption method powered by native crypto libraries(node:crypto/react-native-quick-crypto). Using AES-256-GCM and pbkdf2
			// The master key is not directly used. A new data key is generated from the master key and a 256 bits random salt to prevent nonce reuse problem
			// The file content is base64 encoded. Decoding it before encryption to reduce the size overhead.
			[EncryptionMethod.FileV1]: async () => {
				return JSON.stringify(await crypto.encryptString(key, await crypto.digest(Digest.sha256, this.encryptionNonce_), plainText, 'base64', {
					cipherAlgorithm: CipherAlgorithm.AES_256_GCM,
					authTagLength: 16,
					digestAlgorithm: Digest.sha512,
					keyLength: 32,
					associatedData: emptyUint8Array,
					iterationCount: 3,
				}));
			},

			// New encryption method powered by native crypto libraries(node:crypto/react-native-quick-crypto). Using AES-256-GCM and pbkdf2
			// The master key is not directly used. A new data key is generated from the master key and a 256 bits random salt to prevent nonce reuse problem
			[EncryptionMethod.StringV1]: async () => {
				return JSON.stringify(await crypto.encryptString(key, await crypto.digest(Digest.sha256, this.encryptionNonce_), plainText, 'utf16le', {
					cipherAlgorithm: CipherAlgorithm.AES_256_GCM,
					authTagLength: 16,
					digestAlgorithm: Digest.sha512,
					keyLength: 32,
					associatedData: emptyUint8Array,
					iterationCount: 3,
				}));
			},

			[EncryptionMethod.Custom]: () => {
				// This is handled elsewhere but as a sanity check, throw an exception
				throw new Error('Custom encryption method is not supported here');
			},
		};

		return handlers[method]();
	}

	public async decrypt(method: EncryptionMethod, key: string, cipherText: string) {
		if (!method) throw new Error('Encryption method is required');
		if (!key) throw new Error('Encryption key is required');

		const sjcl = shim.sjclModule;
		const crypto = shim.crypto;
		if (method === EncryptionMethod.KeyV1) {
			return (await crypto.decrypt(key, JSON.parse(cipherText), {
				cipherAlgorithm: CipherAlgorithm.AES_256_GCM,
				authTagLength: 16,
				digestAlgorithm: Digest.sha512,
				keyLength: 32,
				associatedData: emptyUint8Array,
				iterationCount: 220000,
			})).toString('hex');
		} else if (method === EncryptionMethod.FileV1) {
			return (await crypto.decrypt(key, JSON.parse(cipherText), {
				cipherAlgorithm: CipherAlgorithm.AES_256_GCM,
				authTagLength: 16,
				digestAlgorithm: Digest.sha512,
				keyLength: 32,
				associatedData: emptyUint8Array,
				iterationCount: 3,
			})).toString('base64');
		} else if (method === EncryptionMethod.StringV1) {
			return (await crypto.decrypt(key, JSON.parse(cipherText), {
				cipherAlgorithm: CipherAlgorithm.AES_256_GCM,
				authTagLength: 16,
				digestAlgorithm: Digest.sha512,
				keyLength: 32,
				associatedData: emptyUint8Array,
				iterationCount: 3,
			})).toString('utf16le');
		} else if (this.isValidSjclEncryptionMethod(method)) {
			try {
				const output = sjcl.json.decrypt(key, cipherText);

				if (method === EncryptionMethod.SJCL1a || method === EncryptionMethod.SJCL1b) {
					return unescape(output);
				} else {
					return output;
				}
			} catch (error) {
				// SJCL returns a string as error which means stack trace is missing so convert to an error object here
				throw new Error(error.message);
			}
		} else {
			throw new Error(`Unknown decryption method: ${method}`);
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private async encryptAbstract_(source: any, destination: any, options: EncryptOptions = null) {
		options = { encryptionMethod: this.defaultEncryptionMethod(), ...options };

		const method = options.encryptionMethod;
		const masterKeyId = options.masterKeyId ? options.masterKeyId : this.activeMasterKeyId();
		const masterKeyPlainText = (await this.loadedMasterKey(masterKeyId)).plainText;
		const chunkSize = this.chunkSize(method);
		const crypto = shim.crypto;

		const header = {
			encryptionMethod: method,
			masterKeyId: masterKeyId,
		};

		await destination.append(this.encodeHeader_(header));

		let doneSize = 0;

		while (true) {
			const block = await source.read(chunkSize);
			if (!block) break;

			doneSize += chunkSize;
			if (options.onProgress) options.onProgress({ doneSize: doneSize });

			// Wait for a frame so that the app remains responsive in mobile.
			// https://corbt.com/posts/2015/12/22/breaking-up-heavy-processing-in-react-native.html
			await shim.waitForFrame();

			const encrypted = await this.encrypt(method, masterKeyPlainText, block);
			await crypto.increaseNonce(this.encryptionNonce_);

			await destination.append(padLeft(encrypted.length.toString(16), 6, '0'));
			await destination.append(encrypted);
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private async decryptAbstract_(source: any, destination: any, options: EncryptOptions = null) {
		if (!options) options = {};

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const header: any = await this.decodeHeaderSource_(source);
		const masterKeyPlainText = (await this.loadedMasterKey(header.masterKeyId)).plainText;

		let doneSize = 0;

		while (true) {
			const lengthHex = await source.read(6);
			if (!lengthHex) break;
			if (lengthHex.length !== 6) throw new Error(`Invalid block size: ${lengthHex}`);
			const length = parseInt(lengthHex, 16);
			if (!length) continue; // Weird but could be not completely invalid (block of size 0) so continue decrypting

			doneSize += length;
			if (options.onProgress) options.onProgress({ doneSize: doneSize });

			await shim.waitForFrame();

			const block = await source.read(length);

			const plainText = await this.decrypt(header.encryptionMethod, masterKeyPlainText, block);
			await destination.append(plainText);
		}
	}

	private stringReader_(string: string, sync = false) {
		const reader = {
			index: 0,
			read: function(size: number) {
				const output = string.substr(reader.index, size);
				reader.index += size;
				return !sync ? Promise.resolve(output) : output;
			},
			close: function() {},
		};
		return reader;
	}

	private stringWriter_() {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const output: any = {
			data: [],
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			append: async function(data: any) {
				output.data.push(data);
			},
			result: function() {
				return output.data.join('');
			},
			close: function() {},
		};
		return output;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private async fileReader_(path: string, encoding: any) {
		const handle = await this.fsDriver().open(path, 'r');
		const reader = {
			handle: handle,
			read: async (size: number) => {
				return this.fsDriver().readFileChunk(reader.handle, size, encoding);
			},
			close: async () => {
				await this.fsDriver().close(reader.handle);
			},
		};
		return reader;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private async fileWriter_(path: string, encoding: any) {
		return {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			append: async (data: any) => {
				return this.fsDriver().appendFile(path, data, encoding);
			},
			close: function() {},
		};
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async encryptString(plainText: any, options: EncryptOptions = null): Promise<string> {
		const source = this.stringReader_(plainText);
		const destination = this.stringWriter_();
		await this.encryptAbstract_(source, destination, options);
		return destination.result();
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async decryptString(cipherText: any, options: EncryptOptions = null): Promise<string> {
		const source = this.stringReader_(cipherText);
		const destination = this.stringWriter_();
		await this.decryptAbstract_(source, destination, options);
		return destination.data.join('');
	}

	public async encryptFile(srcPath: string, destPath: string, options: EncryptOptions = null) {
		options = { encryptionMethod: this.defaultFileEncryptionMethod(), ...options };

		let source = await this.fileReader_(srcPath, 'base64');
		let destination = await this.fileWriter_(destPath, 'ascii');

		const cleanUp = async () => {
			if (source) await source.close();
			if (destination) await destination.close();
			// eslint-disable-next-line require-atomic-updates
			source = null;
			// eslint-disable-next-line require-atomic-updates
			destination = null;
		};

		try {
			await this.fsDriver().unlink(destPath);
			await this.encryptAbstract_(source, destination, options);
		} catch (error) {
			await cleanUp();
			await this.fsDriver().unlink(destPath);
			throw error;
		}

		await cleanUp();
	}

	public async decryptFile(srcPath: string, destPath: string, options: EncryptOptions = null) {
		let source = await this.fileReader_(srcPath, 'ascii');
		let destination = await this.fileWriter_(destPath, 'base64');

		const cleanUp = async () => {
			if (source) await source.close();
			if (destination) await destination.close();
			// eslint-disable-next-line require-atomic-updates
			source = null;
			// eslint-disable-next-line require-atomic-updates
			destination = null;
		};

		try {
			await this.fsDriver().unlink(destPath);
			await this.decryptAbstract_(source, destination, options);
		} catch (error) {
			await cleanUp();
			await this.fsDriver().unlink(destPath);
			throw error;
		}

		await cleanUp();
	}

	public headerTemplate(version: number) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const r = (this.headerTemplates_ as any)[version];
		if (!r) throw new Error(`Unknown header version: ${version}`);
		return r;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public encodeHeader_(header: any) {
		// Sanity check
		if (header.masterKeyId.length !== 32) throw new Error(`Invalid master key ID size: ${header.masterKeyId}`);

		let encryptionMetadata = '';
		encryptionMetadata += padLeft(header.encryptionMethod.toString(16), 2, '0');
		encryptionMetadata += header.masterKeyId;
		encryptionMetadata = padLeft(encryptionMetadata.length.toString(16), 6, '0') + encryptionMetadata;
		return `JED01${encryptionMetadata}`;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async decodeHeaderString(cipherText: any) {
		const source = this.stringReader_(cipherText);
		return this.decodeHeaderSource_(source);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private async decodeHeaderSource_(source: any) {
		const identifier = await source.read(5);
		if (!isValidHeaderIdentifier(identifier)) throw new JoplinError(`Invalid encryption identifier. Data is not actually encrypted? ID was: ${identifier}`, 'invalidIdentifier');
		const mdSizeHex = await source.read(6);
		const mdSize = parseInt(mdSizeHex, 16);
		if (isNaN(mdSize) || !mdSize) throw new Error(`Invalid header metadata size: ${mdSizeHex}`);
		const md = await source.read(parseInt(mdSizeHex, 16));
		return this.decodeHeaderBytes_(identifier + mdSizeHex + md);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public decodeHeaderBytes_(headerHexaBytes: any) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const reader: any = this.stringReader_(headerHexaBytes, true);
		const identifier = reader.read(3);
		const version = parseInt(reader.read(2), 16);
		if (identifier !== 'JED') throw new Error(`Invalid header (missing identifier): ${headerHexaBytes.substr(0, 64)}`);
		const template = this.headerTemplate(version);

		parseInt(reader.read(6), 16); // Read the size and move the reader pointer forward

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const output: any = {};

		for (let i = 0; i < template.fields.length; i++) {
			const m = template.fields[i];
			const name = m[0];
			const size = m[1];
			const type = m[2];
			let v = reader.read(size);

			if (type === 'int') {
				v = parseInt(v, 16);
			} else if (type === 'hex') {
				// Already in hexa
			} else {
				throw new Error(`Invalid type: ${type}`);
			}

			output[name] = v;
		}

		return output;
	}

	private isValidSjclEncryptionMethod(method: EncryptionMethod) {
		return [EncryptionMethod.SJCL, EncryptionMethod.SJCL1a, EncryptionMethod.SJCL1b, EncryptionMethod.SJCL2, EncryptionMethod.SJCL3, EncryptionMethod.SJCL4].indexOf(method) >= 0;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async itemIsEncrypted(item: any) {
		if (!item) throw new Error('No item');
		const ItemClass = BaseItem.itemClass(item);
		if (!ItemClass.encryptionSupported()) return false;
		return item.encryption_applied && isValidHeaderIdentifier(item.encryption_cipher_text, true);
	}

	public async fileIsEncrypted(path: string) {
		const handle = await this.fsDriver().open(path, 'r');
		const headerIdentifier = await this.fsDriver().readFileChunk(handle, 5, 'ascii');
		await this.fsDriver().close(handle);
		return isValidHeaderIdentifier(headerIdentifier);
	}
}
