const { padLeft } = require('lib/string-utils.js');
const { shim } = require('lib/shim.js');
const Setting = require('lib/models/Setting.js');
const MasterKey = require('lib/models/MasterKey');

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
	}

	static instance() {
		if (this.instance_) return this.instance_;
		this.instance_ = new EncryptionService();
		return this.instance_;
	}

	async loadMasterKeysFromSettings() {
		if (!Setting.value('encryption.enabled')) return;
		const masterKeys = await MasterKey.all();
		const passwords = Setting.value('encryption.passwordCache');
		const activeMasterKeyId = Setting.value('encryption.activeMasterKeyId');

		for (let i = 0; i < masterKeys.length; i++) {
			const mk = masterKeys[i];
			const password = passwords[mk.id];
			if (this.isMasterKeyLoaded(mk.id)) continue;
			if (!password) continue;

			await this.loadMasterKey(mk, password, activeMasterKeyId === mk.id);
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
		if (!this.activeMasterKeyId_) throw new Error('No master key is defined as active');
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

	loadedMasterKey(id) {
		if (!this.loadedMasterKeys_[id]) {
			const error = new Error('Master key is not loaded: ' + id);
			error.code = 'missingMasterKey';
			error.masterKeyId = id;
			throw error;
		}
		return this.loadedMasterKeys_[id];
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

	async encrypt(method, key, plainText) {
		const sjcl = shim.sjclModule;

		if (method === EncryptionService.METHOD_SJCL) {
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
		}

		// Same as first one but slightly more secure (but slower) to encrypt master keys
		if (method === EncryptionService.METHOD_SJCL_2) {
			return sjcl.json.encrypt(key, plainText, {
				v: 1,
				iter: 10000,
				ks: 256,
				ts: 64,
				mode: "ocb2",
				cipher: "aes"
			});
		}

		throw new Error('Unknown encryption method: ' + method);
	}

	async decrypt(method, key, cipherText) {
		const sjcl = shim.sjclModule;
		
		if (method === EncryptionService.METHOD_SJCL || method === EncryptionService.METHOD_SJCL_2) {
			return sjcl.json.decrypt(key, cipherText);
		}

		throw new Error('Unknown decryption method: ' + method);
	}

	async encryptString(plainText) {
		const method = this.defaultEncryptionMethod();
		const masterKeyId = this.activeMasterKeyId();
		const masterKeyPlainText = this.loadedMasterKey(masterKeyId);

		const header = {
			version: 1,
			encryptionMethod: method,
			masterKeyId: masterKeyId,
		};

		let cipherText = [];

		cipherText.push(this.encodeHeader_(header));

		let fromIndex = 0;

		while (true) {
			const block = plainText.substr(fromIndex, this.chunkSize_);
			if (!block) break;

			fromIndex += block.length;

			const encrypted = await this.encrypt(method, masterKeyPlainText, block);

			cipherText.push(padLeft(encrypted.length.toString(16), 6, '0'));
			cipherText.push(encrypted);
		}

		return cipherText.join('');
	}

	async decryptString(cipherText) {
		const header = this.decodeHeader_(cipherText);

		const masterKeyPlainText = this.loadedMasterKey(header.masterKeyId);

		let index = header.length;

		let output = [];

		while (index < cipherText.length) {
			const length = parseInt(cipherText.substr(index, 6), 16);
			index += 6;
			if (!length) continue; // Weird but could be not completely invalid (block of size 0) so continue decrypting
			const block = cipherText.substr(index, length);
			index += length;

			const plainText = await this.decrypt(header.encryptionMethod, masterKeyPlainText, block);
			output.push(plainText);
		}

		return output.join('');
	}

	async encryptFile(method, key, srcPath, destPath) {
		const fsDriver = this.fsDriver();

		let handle = await fsDriver.open(srcPath, 'r');

		const cleanUp = () => {
			if (handle) fsDriver.close(handle);
			handle = null;
		}

		try {
			await fsDriver.unlink(destPath);

			// Header
			await fsDriver.appendFile(destPath, '01', 'ascii'); // Version number
			await fsDriver.appendFile(destPath, padLeft(EncryptionService.METHOD_SJCL.toString(16), 2, '0'), 'ascii'); // Encryption method

			while (true) {
				const plainText = await fsDriver.readFileChunk(handle, this.chunkSize_, 'base64');
				if (!plainText) break;

				const cipherText = await this.encrypt(method, key, plainText);

				await fsDriver.appendFile(destPath, padLeft(cipherText.length.toString(16), 6, '0'), 'ascii'); // Data - Length
				await fsDriver.appendFile(destPath, cipherText, 'ascii'); // Data - Data
			}
		} catch (error) {
			cleanUp();
			await fsDriver.unlink(destPath);
			throw error;
		}

		cleanUp();
	}

	async decryptFile(key, srcPath, destPath) {
		const fsDriver = this.fsDriver();

		let handle = await fsDriver.open(srcPath, 'r');

		const cleanUp = () => {
			if (handle) fsDriver.close(handle);
			handle = null;
		}

		try {
			await fsDriver.unlink(destPath);

			const headerHexaBytes = await fsDriver.readFileChunk(handle, 4, 'ascii');
			const header = this.decodeHeader_(headerHexaBytes);

			while (true) {
				const lengthHex = await fsDriver.readFileChunk(handle, 6, 'ascii');
				if (!lengthHex) break;

				const length = parseInt(lengthHex, 16);

				const cipherText = await fsDriver.readFileChunk(handle, length, 'ascii');
				if (!cipherText) break;

				const plainText = await this.decrypt(header.encryptionMethod, key, cipherText);

				await fsDriver.appendFile(destPath, plainText, 'base64');
			}
		} catch (error) {
			cleanUp();
			await fsDriver.unlink(destPath);
			throw error;
		}

		cleanUp();
	}

	encodeHeader_(header) {
		// Sanity check
		if (header.masterKeyId.length !== 32) throw new Error('Invalid master key ID size: ' + header.masterKeyId);

		const output = [];
		output.push(padLeft(header.version.toString(16), 2, '0'));
		output.push(padLeft(header.encryptionMethod.toString(16), 2, '0'));
		output.push(header.masterKeyId);
		return output.join('');
	}

	decodeHeader_(headerHexaBytes) {
		const headerTemplates = {
			1: [
				[ 'encryptionMethod', 2, 'int' ],
				[ 'masterKeyId', 32, 'hex' ],
			],
		};

		const output = {};
		const version = parseInt(headerHexaBytes.substr(0, 2), 16);
		const template = headerTemplates[version];

		if (!template) throw new Error('Invalid header version: ' + version);

		output.version = version;

		let index = 2;
		for (let i = 0; i < template.length; i++) {
			const m = template[i];
			const type = m[2];
			let v = headerHexaBytes.substr(index, m[1]);

			if (type === 'int') {
				v = parseInt(v, 16);
			} else if (type === 'hex') {
				// Already in hexa
			} else {
				throw new Error('Invalid type: ' + type);
			}

			index += m[1];
			output[m[0]] = v;
		}

		output.length = index;

		return output;
	}

}

EncryptionService.METHOD_SJCL = 1;
EncryptionService.METHOD_SJCL_2 = 2;

EncryptionService.fsDriver_ = null;

module.exports = EncryptionService;