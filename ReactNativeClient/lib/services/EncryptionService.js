const { padLeft } = require('lib/string-utils.js');
const { shim } = require('lib/shim.js');
const Setting = require('lib/models/Setting.js');
const MasterKey = require('lib/models/MasterKey');
const BaseItem = require('lib/models/BaseItem');
const { _ } = require('lib/locale.js');

function hexPad(s, length) {
	return padLeft(s, length, '0');
}

class EncryptionService {

	constructor() {
		// Note: 1 MB is very slow with Node and probably even worse on mobile. 50 KB seems to work well
		// and doesn't produce too much overhead in terms of headers.
		this.chunkSize_ = 50000;
		this.loadedMasterKeys_ = {};
		this.activeMasterKeyId_ = null;
		this.defaultEncryptionMethod_ = EncryptionService.METHOD_SJCL;

		this.headerTemplates_ = {
			1: {
				fields: [
					[ 'encryptionMethod', 2, 'int' ],
					[ 'masterKeyId', 32, 'hex' ],
				],
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
		const hasEncryptedItems = await BaseItem.hasEncryptedItems();
		if (hasEncryptedItems) throw new Error(_('Encryption cannot currently be disabled because some items are still encrypted. Please wait for all the items to be decrypted and try again.'));
		
		Setting.setValue('encryption.enabled', false);
		// The only way to make sure everything gets decrypted on the sync target is
		// to re-sync everything.
		await BaseItem.forceSyncAll();
	}

	async loadMasterKeysFromSettings() {
		if (!Setting.value('encryption.enabled')) {
			this.unloadAllMasterKeys();
		} else {
			const masterKeys = await MasterKey.all();
			const passwords = Setting.value('encryption.passwordCache');
			const activeMasterKeyId = Setting.value('encryption.activeMasterKeyId');

			for (let i = 0; i < masterKeys.length; i++) {
				const mk = masterKeys[i];
				const password = passwords[mk.id];
				if (this.isMasterKeyLoaded(mk.id)) continue;
				if (!password) continue;

				try {
					await this.loadMasterKey(mk, password, activeMasterKeyId === mk.id);
				} catch (error) {
					this.logger().warn('Cannot load master key ' + mk.id + '. Invalid password?', error);
				}
			}
		}
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

	async loadMasterKey(model, password, makeActive = false) {
		if (!model.id) throw new Error('Master key does not have an ID - save it first');
		this.loadedMasterKeys_[model.id] = await this.decryptMasterKey(model, password);
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
			const error = new Error('Master key is not loaded: ' + id);
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

	async seedSjcl() {
		throw new Error('NOT TESTED');

		// Just putting this here in case it becomes needed
		// Normally seeding random bytes is not needed for our use since
		// we use shim.randomBytes directly to generate master keys.

		const sjcl = shim.sjclModule;
		const randomBytes = await shim.randomBytes(1024/8);
		const hexBytes = randomBytes.map((a) => { return a.toString(16) });
		const hexSeed = sjcl.codec.hex.toBits(hexBytes.join(''));
		sjcl.random.addEntropy(hexSeed, 1024, 'shim.randomBytes');
	}

	async generateMasterKey(password) {
		const bytes = await shim.randomBytes(256);
		const hexaBytes = bytes.map((a) => { return hexPad(a.toString(16), 2); }).join('');
		const checksum = this.sha256(hexaBytes);
		const encryptionMethod = EncryptionService.METHOD_SJCL_2;
		const cipherText = await this.encrypt(encryptionMethod, password, hexaBytes);
		const now = Date.now();

		return {
			created_time: now,
			updated_time: now,
			source_application: Setting.value('appId'),
			encryption_method: encryptionMethod,
			checksum: checksum,
			content: cipherText,
		};
	}

	async decryptMasterKey(model, password) {
		const plainText = await this.decrypt(model.encryption_method, password, model.content);
		const checksum = this.sha256(plainText);
		if (checksum !== model.checksum) throw new Error('Could not decrypt master key (checksum failed)');
		return plainText;
	}

	async checkMasterKeyPassword(model, password) {
		try {
			await this.decryptMasterKey(model, password);
		} catch (error) {
			return false;
		}

		return true;
	}

	async encrypt(method, key, plainText) {
		const sjcl = shim.sjclModule;

		if (method === EncryptionService.METHOD_SJCL) {
			try {
				// Good demo to understand each parameter: https://bitwiseshiftleft.github.io/sjcl/demo/
				return sjcl.json.encrypt(key, plainText, {
					v: 1, // version
					iter: 1000, // Defaults to 10000 in sjcl but since we're running this on mobile devices, use a lower value. Maybe review this after some time. https://security.stackexchange.com/questions/3959/recommended-of-iterations-when-using-pkbdf2-sha256
					ks: 128, // Key size - "128 bits should be secure enough"
					ts: 64, // ???
					mode: "ocb2", //  The cipher mode is a standard for how to use AES and other algorithms to encrypt and authenticate your message. OCB2 mode is slightly faster and has more features, but CCM mode has wider support because it is not patented. 
					//"adata":"", // Associated Data - not needed?
					cipher: "aes"
				});
			} catch (error) {
				// SJCL returns a string as error which means stack trace is missing so convert to an error object here
				throw new Error(error.message);
			}
		}

		// Same as first one but slightly more secure (but slower) to encrypt master keys
		if (method === EncryptionService.METHOD_SJCL_2) {
			try {
				return sjcl.json.encrypt(key, plainText, {
					v: 1,
					iter: 10000,
					ks: 256,
					ts: 64,
					mode: "ocb2",
					cipher: "aes"
				});
			} catch (error) {
				// SJCL returns a string as error which means stack trace is missing so convert to an error object here
				throw new Error(error.message);
			}
		}

		throw new Error('Unknown encryption method: ' + method);
	}

	async decrypt(method, key, cipherText) {
		const sjcl = shim.sjclModule;
		
		if (method === EncryptionService.METHOD_SJCL || method === EncryptionService.METHOD_SJCL_2) {
			try {
				return sjcl.json.decrypt(key, cipherText);
			} catch (error) {
				// SJCL returns a string as error which means stack trace is missing so convert to an error object here
				throw new Error(error.message);
			}
		}

		throw new Error('Unknown decryption method: ' + method);
	}

	async encryptAbstract_(source, destination) {
		const method = this.defaultEncryptionMethod();
		const masterKeyId = this.activeMasterKeyId();
		const masterKeyPlainText = this.loadedMasterKey(masterKeyId);

		const header = {
			encryptionMethod: method,
			masterKeyId: masterKeyId,
		};

		await destination.append(this.encodeHeader_(header));

		while (true) {
			const block = await source.read(this.chunkSize_);
			if (!block) break;

			const encrypted = await this.encrypt(method, masterKeyPlainText, block);
			await destination.append(padLeft(encrypted.length.toString(16), 6, '0'));
			await destination.append(encrypted);
		}
	}

	async decryptAbstract_(source, destination) {
		const identifier = await source.read(5);
		const mdSizeHex = await source.read(6);
		const md = await source.read(parseInt(mdSizeHex, 16));
		const header = this.decodeHeader_(identifier + mdSizeHex + md);
		const masterKeyPlainText = this.loadedMasterKey(header.masterKeyId);

		while (true) {
			const lengthHex = await source.read(6);
			if (!lengthHex) break;
			if (lengthHex.length !== 6) throw new Error('Invalid block size: ' + lengthHex);
			const length = parseInt(lengthHex, 16);
			if (!length) continue; // Weird but could be not completely invalid (block of size 0) so continue decrypting

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
			read: async (size) => {
				return this.fsDriver().readFileChunk(reader.handle, size, encoding);
			},
			close: () => {
				this.fsDriver().close(reader.handle);
			},
		};
		return reader;
	}

	async fileWriter_(path, encoding) {
		return {
			append: async (data) => {
				return this.fsDriver().appendFile(path, data, encoding);
			},
			close: function() {},
		};
	}

	async encryptString(plainText) {
		const source = this.stringReader_(plainText);
		const destination = this.stringWriter_();
		await this.encryptAbstract_(source, destination);
		return destination.result();
	}

	async decryptString(cipherText) {
		const source = this.stringReader_(cipherText);
		const destination = this.stringWriter_();
		await this.decryptAbstract_(source, destination);
		return destination.data.join('');
	}

	async encryptFile(srcPath, destPath) {
		let source = await this.fileReader_(srcPath, 'base64');
		let destination = await this.fileWriter_(destPath, 'ascii');

		const cleanUp = () => {
			if (source) source.close();
			if (destination) destination.close();
			source = null;
			destination = null;
		}

		try {
			await this.fsDriver().unlink(destPath);
			await this.encryptAbstract_(source, destination);
		} catch (error) {
			cleanUp();
			await this.fsDriver().unlink(destPath);
			throw error;
		}

		cleanUp();
	}

	async decryptFile(srcPath, destPath) {
		let source = await this.fileReader_(srcPath, 'ascii');
		let destination = await this.fileWriter_(destPath, 'base64');

		const cleanUp = () => {
			if (source) source.close();
			if (destination) destination.close();
			source = null;
			destination = null;
		}

		try {
			await this.fsDriver().unlink(destPath);
			await this.decryptAbstract_(source, destination);
		} catch (error) {
			cleanUp();
			await this.fsDriver().unlink(destPath);
			throw error;
		}

		cleanUp();
	}

	decodeHeaderVersion_(hexaByte) {
		if (hexaByte.length !== 2) throw new Error('Invalid header version length: ' + hexaByte);
		return parseInt(hexaByte, 16);
	}

	headerTemplate(version) {
		const r = this.headerTemplates_[version];
		if (!r) throw new Error('Unknown header version: ' + version);
		return r;
	}

	encodeHeader_(header) {
		// Sanity check
		if (header.masterKeyId.length !== 32) throw new Error('Invalid master key ID size: ' + header.masterKeyId);

		let encryptionMetadata = '';
		encryptionMetadata += padLeft(header.encryptionMethod.toString(16), 2, '0');
		encryptionMetadata += header.masterKeyId;
		encryptionMetadata = padLeft(encryptionMetadata.length.toString(16), 6, '0') + encryptionMetadata;
		return 'JED01' + encryptionMetadata;
	}

	decodeHeader_(headerHexaBytes) {
		const reader = this.stringReader_(headerHexaBytes, true);
		const identifier = reader.read(3);
		const version = parseInt(reader.read(2), 16);
		if (identifier !== 'JED') throw new Error('Invalid header (missing identifier): ' + headerHexaBytes.substr(0,64));
		const template = this.headerTemplate(version);

		const size = parseInt(reader.read(6), 16);

		let output = {};

		for (let i = 0; i < template.fields.length; i++) {
			const m = template.fields[i];
			const type = m[2];
			let v = reader.read(m[1]);

			if (type === 'int') {
				v = parseInt(v, 16);
			} else if (type === 'hex') {
				// Already in hexa
			} else {
				throw new Error('Invalid type: ' + type);
			}

			output[m[0]] = v;
		}

		return output;
	}

}

EncryptionService.METHOD_SJCL = 1;
EncryptionService.METHOD_SJCL_2 = 2;

EncryptionService.fsDriver_ = null;

module.exports = EncryptionService;