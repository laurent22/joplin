const { padLeft } = require('lib/string-utils.js');
const { Logger } = require('lib/logger.js');
const { shim } = require('lib/shim.js');
const Setting = require('lib/models/Setting.js');
const MasterKey = require('lib/models/MasterKey');
const BaseItem = require('lib/models/BaseItem');
const JoplinError = require('lib/JoplinError');

function hexPad(s, length) {
	return padLeft(s, length, '0');
}

class EncryptionService {
	constructor() {
		// Note: 1 MB is very slow with Node and probably even worse on mobile.
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
		this.chunkSize_ = 5000;
		this.loadedMasterKeys_ = {};
		this.activeMasterKeyId_ = null;
		this.defaultEncryptionMethod_ = EncryptionService.METHOD_SJCL_1A;
		this.defaultMasterKeyEncryptionMethod_ = EncryptionService.METHOD_SJCL_4;
		this.logger_ = new Logger();

		this.headerTemplates_ = {
			// Template version 1
			1: {
				// Fields are defined as [name, valueSize, valueType]
				fields: [['encryptionMethod', 2, 'int'], ['masterKeyId', 32, 'hex']],
			},
		};
	}

	static instance() {
		if (this.instance_) return this.instance_;
		this.instance_ = new EncryptionService();
		return this.instance_;
	}

	setLogger(l) {
		this.logger_ = l;
	}

	logger() {
		return this.logger_;
	}

	async generateMasterKeyAndEnableEncryption(password) {
		let masterKey = await this.generateMasterKey(password);
		masterKey = await MasterKey.save(masterKey);
		await this.enableEncryption(masterKey, password);
		await this.loadMasterKeysFromSettings();
		return masterKey;
	}

	async enableEncryption(masterKey, password = null) {
		Setting.setValue('encryption.enabled', true);
		Setting.setValue('encryption.activeMasterKeyId', masterKey.id);

		if (password) {
			let passwordCache = Setting.value('encryption.passwordCache');
			passwordCache[masterKey.id] = password;
			Setting.setValue('encryption.passwordCache', passwordCache);
		}

		// Mark only the non-encrypted ones for sync since, if there are encrypted ones,
		// it means they come from the sync target and are already encrypted over there.
		await BaseItem.markAllNonEncryptedForSync();
	}

	async disableEncryption() {
		// Allow disabling encryption even if some items are still encrypted, because whether E2EE is enabled or disabled
		// should not affect whether items will enventually be decrypted or not (DecryptionWorker will still work as
		// long as there are encrypted items). Also even if decryption is disabled, it's possible that encrypted items
		// will still be received via synchronisation.

		// const hasEncryptedItems = await BaseItem.hasEncryptedItems();
		// if (hasEncryptedItems) throw new Error(_('Encryption cannot currently be disabled because some items are still encrypted. Please wait for all the items to be decrypted and try again.'));

		Setting.setValue('encryption.enabled', false);
		// The only way to make sure everything gets decrypted on the sync target is
		// to re-sync everything.
		await BaseItem.forceSyncAll();
	}

	async loadMasterKeysFromSettings() {
		const masterKeys = await MasterKey.all();
		const passwords = Setting.value('encryption.passwordCache');
		const activeMasterKeyId = Setting.value('encryption.activeMasterKeyId');

		this.logger().info(`Trying to load ${masterKeys.length} master keys...`);

		for (let i = 0; i < masterKeys.length; i++) {
			let mk = masterKeys[i];
			const password = passwords[mk.id];
			if (this.isMasterKeyLoaded(mk.id)) continue;
			if (!password) continue;

			try {
				await this.loadMasterKey_(mk, password, activeMasterKeyId === mk.id);
			} catch (error) {
				this.logger().warn(`Cannot load master key ${mk.id}. Invalid password?`, error);
			}
		}

		this.logger().info(`Loaded master keys: ${this.loadedMasterKeysCount()}`);
	}

	loadedMasterKeysCount() {
		let output = 0;
		for (let n in this.loadedMasterKeys_) {
			if (!this.loadedMasterKeys_[n]) continue;
			output++;
		}
		return output;
	}

	chunkSize() {
		return this.chunkSize_;
	}

	defaultEncryptionMethod() {
		return this.defaultEncryptionMethod_;
	}

	setActiveMasterKeyId(id) {
		this.activeMasterKeyId_ = id;
	}

	activeMasterKeyId() {
		if (!this.activeMasterKeyId_) {
			const error = new Error('No master key is defined as active. Check this: Either one or more master keys exist but no password was provided for any of them. Or no master key exist. Or master keys and password exist, but none was set as active.');
			error.code = 'noActiveMasterKey';
			throw error;
		}
		return this.activeMasterKeyId_;
	}

	isMasterKeyLoaded(id) {
		return !!this.loadedMasterKeys_[id];
	}

	async loadMasterKey_(model, password, makeActive = false) {
		if (!model.id) throw new Error('Master key does not have an ID - save it first');
		this.loadedMasterKeys_[model.id] = await this.decryptMasterKey_(model, password);
		if (makeActive) this.setActiveMasterKeyId(model.id);
	}

	unloadMasterKey(model) {
		delete this.loadedMasterKeys_[model.id];
	}

	unloadAllMasterKeys() {
		for (let id in this.loadedMasterKeys_) {
			if (!this.loadedMasterKeys_.hasOwnProperty(id)) continue;
			this.unloadMasterKey(this.loadedMasterKeys_[id]);
		}
	}

	loadedMasterKey(id) {
		if (!this.loadedMasterKeys_[id]) {
			const error = new Error(`Master key is not loaded: ${id}`);
			error.code = 'masterKeyNotLoaded';
			error.masterKeyId = id;
			throw error;
		}
		return this.loadedMasterKeys_[id];
	}

	loadedMasterKeyIds() {
		let output = [];
		for (let id in this.loadedMasterKeys_) {
			if (!this.loadedMasterKeys_.hasOwnProperty(id)) continue;
			output.push(id);
		}
		return output;
	}

	fsDriver() {
		if (!EncryptionService.fsDriver_) throw new Error('EncryptionService.fsDriver_ not set!');
		return EncryptionService.fsDriver_;
	}

	sha256(string) {
		const sjcl = shim.sjclModule;
		const bitArray = sjcl.hash.sha256.hash(string);
		return sjcl.codec.hex.fromBits(bitArray);
	}

	// async seedSjcl() {
	// 	throw new Error('NOT TESTED');

	// 	// Just putting this here in case it becomes needed
	// 	// Normally seeding random bytes is not needed for our use since
	// 	// we use shim.randomBytes directly to generate master keys.

	// 	const sjcl = shim.sjclModule;
	// 	const randomBytes = await shim.randomBytes(1024 / 8);
	// 	const hexBytes = randomBytes.map(a => {
	// 		return a.toString(16);
	// 	});
	// 	const hexSeed = sjcl.codec.hex.toBits(hexBytes.join(''));
	// 	sjcl.random.addEntropy(hexSeed, 1024, 'shim.randomBytes');
	// }

	async randomHexString(byteCount) {
		const bytes = await shim.randomBytes(byteCount);
		return bytes
			.map(a => {
				return hexPad(a.toString(16), 2);
			})
			.join('');
	}

	masterKeysThatNeedUpgrading(masterKeys) {
		return MasterKey.allWithoutEncryptionMethod(masterKeys, this.defaultMasterKeyEncryptionMethod_);
	}

	async upgradeMasterKey(model, decryptionPassword) {
		const newEncryptionMethod = this.defaultMasterKeyEncryptionMethod_;
		const plainText = await this.decryptMasterKey_(model, decryptionPassword);
		const newContent = await this.encryptMasterKeyContent_(newEncryptionMethod, plainText, decryptionPassword);
		return { ...model, ...newContent };
	}

	async encryptMasterKeyContent_(encryptionMethod, hexaBytes, password) {
		// Checksum is not necessary since decryption will already fail if data is invalid
		const checksum = encryptionMethod === EncryptionService.METHOD_SJCL_2 ? this.sha256(hexaBytes) : '';
		const cipherText = await this.encrypt(encryptionMethod, password, hexaBytes);

		return {
			checksum: checksum,
			encryption_method: encryptionMethod,
			content: cipherText,
		};
	}

	async generateMasterKeyContent_(password, options = null) {
		options = Object.assign({}, {
			encryptionMethod: this.defaultMasterKeyEncryptionMethod_,
		}, options);

		const bytes = await shim.randomBytes(256);
		const hexaBytes = bytes.map(a => hexPad(a.toString(16), 2)).join('');

		return this.encryptMasterKeyContent_(options.encryptionMethod, hexaBytes, password);
	}

	async generateMasterKey(password, options = null) {
		const model = await this.generateMasterKeyContent_(password, options);

		const now = Date.now();
		model.created_time = now;
		model.updated_time = now;
		model.source_application = Setting.value('appId');

		return model;
	}

	async decryptMasterKey_(model, password) {
		const plainText = await this.decrypt(model.encryption_method, password, model.content);
		if (model.encryption_method === EncryptionService.METHOD_SJCL_2) {
			const checksum = this.sha256(plainText);
			if (checksum !== model.checksum) throw new Error('Could not decrypt master key (checksum failed)');
		}
		return plainText;
	}

	async checkMasterKeyPassword(model, password) {
		try {
			await this.decryptMasterKey_(model, password);
		} catch (error) {
			return false;
		}

		return true;
	}

	wrapSjclError(sjclError) {
		const error = new Error(sjclError.message);
		error.stack = sjclError.stack;
		return error;
	}

	async encrypt(method, key, plainText) {
		if (!method) throw new Error('Encryption method is required');
		if (!key) throw new Error('Encryption key is required');

		const sjcl = shim.sjclModule;

		// 2020-01-23: Deprecated and no longer secure due to the use og OCB2 mode - do not use.
		if (method === EncryptionService.METHOD_SJCL) {
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
		}

		// 2020-03-06: Added method to fix https://github.com/laurent22/joplin/issues/2591
		//             Also took the opportunity to change number of key derivations, per Isaac Potoczny's suggestion
		if (method === EncryptionService.METHOD_SJCL_1A) {
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
		}

		// 2020-01-23: Deprectated - see above.
		// Was used to encrypt master keys
		if (method === EncryptionService.METHOD_SJCL_2) {
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
		}

		if (method === EncryptionService.METHOD_SJCL_3) {
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
		}

		// Same as above but more secure (but slower) to encrypt master keys
		if (method === EncryptionService.METHOD_SJCL_4) {
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
		}

		throw new Error(`Unknown encryption method: ${method}`);
	}

	async decrypt(method, key, cipherText) {
		if (!method) throw new Error('Encryption method is required');
		if (!key) throw new Error('Encryption key is required');

		const sjcl = shim.sjclModule;
		if (!this.isValidEncryptionMethod(method)) throw new Error(`Unknown decryption method: ${method}`);

		try {
			const output = sjcl.json.decrypt(key, cipherText);

			if (method === EncryptionService.METHOD_SJCL_1A) {
				return unescape(output);
			} else {
				return output;
			}
		} catch (error) {
			// SJCL returns a string as error which means stack trace is missing so convert to an error object here
			throw new Error(error.message);
		}
	}

	async encryptAbstract_(source, destination, options = null) {
		options = Object.assign({}, {
			encryptionMethod: this.defaultEncryptionMethod(),
		}, options);

		const method = options.encryptionMethod;
		const masterKeyId = this.activeMasterKeyId();
		const masterKeyPlainText = this.loadedMasterKey(masterKeyId);

		const header = {
			encryptionMethod: method,
			masterKeyId: masterKeyId,
		};

		await destination.append(this.encodeHeader_(header));

		let doneSize = 0;

		while (true) {
			const block = await source.read(this.chunkSize_);
			if (!block) break;

			doneSize += this.chunkSize_;
			if (options.onProgress) options.onProgress({ doneSize: doneSize });

			// Wait for a frame so that the app remains responsive in mobile.
			// https://corbt.com/posts/2015/12/22/breaking-up-heavy-processing-in-react-native.html
			await shim.waitForFrame();

			const encrypted = await this.encrypt(method, masterKeyPlainText, block);

			await destination.append(padLeft(encrypted.length.toString(16), 6, '0'));
			await destination.append(encrypted);
		}
	}

	async decryptAbstract_(source, destination, options = null) {
		if (!options) options = {};

		const header = await this.decodeHeaderSource_(source);
		const masterKeyPlainText = this.loadedMasterKey(header.masterKeyId);

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

	stringReader_(string, sync = false) {
		const reader = {
			index: 0,
			read: function(size) {
				const output = string.substr(reader.index, size);
				reader.index += size;
				return !sync ? Promise.resolve(output) : output;
			},
			close: function() {},
		};
		return reader;
	}

	stringWriter_() {
		const output = {
			data: [],
			append: async function(data) {
				output.data.push(data);
			},
			result: function() {
				return output.data.join('');
			},
			close: function() {},
		};
		return output;
	}

	async fileReader_(path, encoding) {
		const handle = await this.fsDriver().open(path, 'r');
		const reader = {
			handle: handle,
			read: async size => {
				return this.fsDriver().readFileChunk(reader.handle, size, encoding);
			},
			close: async () => {
				await this.fsDriver().close(reader.handle);
			},
		};
		return reader;
	}

	async fileWriter_(path, encoding) {
		return {
			append: async data => {
				return this.fsDriver().appendFile(path, data, encoding);
			},
			close: function() {},
		};
	}

	async encryptString(plainText, options = null) {
		const source = this.stringReader_(plainText);
		const destination = this.stringWriter_();
		await this.encryptAbstract_(source, destination, options);
		return destination.result();
	}

	async decryptString(cipherText, options = null) {
		const source = this.stringReader_(cipherText);
		const destination = this.stringWriter_();
		await this.decryptAbstract_(source, destination, options);
		return destination.data.join('');
	}

	async encryptFile(srcPath, destPath, options = null) {
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
			cleanUp();
			await this.fsDriver().unlink(destPath);
			throw error;
		}

		await cleanUp();
	}

	async decryptFile(srcPath, destPath, options = null) {
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
			cleanUp();
			await this.fsDriver().unlink(destPath);
			throw error;
		}

		await cleanUp();
	}

	headerTemplate(version) {
		const r = this.headerTemplates_[version];
		if (!r) throw new Error(`Unknown header version: ${version}`);
		return r;
	}

	encodeHeader_(header) {
		// Sanity check
		if (header.masterKeyId.length !== 32) throw new Error(`Invalid master key ID size: ${header.masterKeyId}`);

		let encryptionMetadata = '';
		encryptionMetadata += padLeft(header.encryptionMethod.toString(16), 2, '0');
		encryptionMetadata += header.masterKeyId;
		encryptionMetadata = padLeft(encryptionMetadata.length.toString(16), 6, '0') + encryptionMetadata;
		return `JED01${encryptionMetadata}`;
	}

	async decodeHeaderString(cipherText) {
		const source = this.stringReader_(cipherText);
		return this.decodeHeaderSource_(source);
	}

	async decodeHeaderSource_(source) {
		const identifier = await source.read(5);
		if (!this.isValidHeaderIdentifier(identifier)) throw new JoplinError(`Invalid encryption identifier. Data is not actually encrypted? ID was: ${identifier}`, 'invalidIdentifier');
		const mdSizeHex = await source.read(6);
		const mdSize = parseInt(mdSizeHex, 16);
		if (isNaN(mdSize) || !mdSize) throw new Error(`Invalid header metadata size: ${mdSizeHex}`);
		const md = await source.read(parseInt(mdSizeHex, 16));
		return this.decodeHeaderBytes_(identifier + mdSizeHex + md);
	}

	decodeHeaderBytes_(headerHexaBytes) {
		const reader = this.stringReader_(headerHexaBytes, true);
		const identifier = reader.read(3);
		const version = parseInt(reader.read(2), 16);
		if (identifier !== 'JED') throw new Error(`Invalid header (missing identifier): ${headerHexaBytes.substr(0, 64)}`);
		const template = this.headerTemplate(version);

		parseInt(reader.read(6), 16); // Read the size and move the reader pointer forward

		let output = {};

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

	isValidHeaderIdentifier(id, ignoreTooLongLength = false) {
		if (!id) return false;
		if (!ignoreTooLongLength && id.length !== 5) return false;
		return /JED\d\d/.test(id);
	}

	isValidEncryptionMethod(method) {
		return [EncryptionService.METHOD_SJCL, EncryptionService.METHOD_SJCL_1A, EncryptionService.METHOD_SJCL_2, EncryptionService.METHOD_SJCL_3, EncryptionService.METHOD_SJCL_4].indexOf(method) >= 0;
	}

	async itemIsEncrypted(item) {
		if (!item) throw new Error('No item');
		const ItemClass = BaseItem.itemClass(item);
		if (!ItemClass.encryptionSupported()) return false;
		return item.encryption_applied && this.isValidHeaderIdentifier(item.encryption_cipher_text, true);
	}

	async fileIsEncrypted(path) {
		const handle = await this.fsDriver().open(path, 'r');
		const headerIdentifier = await this.fsDriver().readFileChunk(handle, 5, 'ascii');
		await this.fsDriver().close(handle);
		return this.isValidHeaderIdentifier(headerIdentifier);
	}
}

EncryptionService.METHOD_SJCL = 1;
EncryptionService.METHOD_SJCL_2 = 2;
EncryptionService.METHOD_SJCL_3 = 3;
EncryptionService.METHOD_SJCL_4 = 4;
EncryptionService.METHOD_SJCL_1A = 5;

EncryptionService.fsDriver_ = null;

module.exports = EncryptionService;
