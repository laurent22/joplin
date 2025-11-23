"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionMethod = void 0;
exports.isValidHeaderIdentifier = isValidHeaderIdentifier;
const types_1 = require("./types");
const Logger_1 = require("@joplin/utils/Logger");
const shim_1 = require("../../shim");
const Setting_1 = require("../../models/Setting");
const MasterKey_1 = require("../../models/MasterKey");
const BaseItem_1 = require("../../models/BaseItem");
const JoplinError_1 = require("../../JoplinError");
const syncInfoUtils_1 = require("../synchronizer/syncInfoUtils");
const PerformanceLogger_1 = require("../../PerformanceLogger");
const { padLeft } = require('../../string-utils.js');
const logger = Logger_1.default.create('EncryptionService');
const perfLogger = PerformanceLogger_1.default.create();
const emptyUint8Array = new Uint8Array(0);
function hexPad(s, length) {
    return padLeft(s, length, '0');
}
function isValidHeaderIdentifier(id, ignoreTooLongLength = false) {
    if (!id)
        return false;
    if (!ignoreTooLongLength && id.length !== 5)
        return false;
    return /JED\d\d/.test(id);
}
var EncryptionMethod;
(function (EncryptionMethod) {
    EncryptionMethod[EncryptionMethod["SJCL"] = 1] = "SJCL";
    EncryptionMethod[EncryptionMethod["SJCL2"] = 2] = "SJCL2";
    EncryptionMethod[EncryptionMethod["SJCL3"] = 3] = "SJCL3";
    EncryptionMethod[EncryptionMethod["SJCL4"] = 4] = "SJCL4";
    EncryptionMethod[EncryptionMethod["SJCL1a"] = 5] = "SJCL1a";
    EncryptionMethod[EncryptionMethod["Custom"] = 6] = "Custom";
    EncryptionMethod[EncryptionMethod["SJCL1b"] = 7] = "SJCL1b";
    EncryptionMethod[EncryptionMethod["KeyV1"] = 8] = "KeyV1";
    EncryptionMethod[EncryptionMethod["FileV1"] = 9] = "FileV1";
    EncryptionMethod[EncryptionMethod["StringV1"] = 10] = "StringV1";
})(EncryptionMethod || (exports.EncryptionMethod = EncryptionMethod = {}));
class EncryptionService {
    constructor() {
        this.encryptedMasterKeys_ = new Map();
        this.decryptedMasterKeys_ = new Map();
        this.defaultEncryptionMethod_ = EncryptionMethod.StringV1; // public because used in tests
        this.defaultFileEncryptionMethod_ = EncryptionMethod.FileV1; // public because used in tests
        this.defaultMasterKeyEncryptionMethod_ = EncryptionMethod.KeyV1;
        this.encryptionNonce_ = null;
        this.headerTemplates_ = {
            // Template version 1
            1: {
                // Fields are defined as [name, valueSize, valueType]
                fields: [['encryptionMethod', 2, 'int'], ['masterKeyId', 32, 'hex']],
            },
        };
        const crypto = shim_1.default.crypto;
        crypto.generateNonce(new Uint8Array(36))
            // eslint-disable-next-line promise/prefer-await-to-then
            .then((nonce) => this.encryptionNonce_ = nonce)
            // eslint-disable-next-line promise/prefer-await-to-then
            .catch((error) => logger.error(error));
    }
    static instance() {
        if (this.instance_)
            return this.instance_;
        this.instance_ = new EncryptionService();
        return this.instance_;
    }
    get defaultMasterKeyEncryptionMethod() {
        return this.defaultMasterKeyEncryptionMethod_;
    }
    loadedMasterKeysCount() {
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
    chunkSize(method) {
        const encryptionMethodChunkSizeMap = {
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
    defaultEncryptionMethod() {
        return this.defaultEncryptionMethod_;
    }
    defaultFileEncryptionMethod() {
        return this.defaultFileEncryptionMethod_;
    }
    setActiveMasterKeyId(id) {
        (0, syncInfoUtils_1.setActiveMasterKeyId)(id);
    }
    activeMasterKeyId() {
        const id = (0, syncInfoUtils_1.getActiveMasterKeyId)();
        if (!id) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            const error = new Error('No master key is defined as active. Check this: Either one or more master keys exist but no password was provided for any of them. Or no master key exist. Or master keys and password exist, but none was set as active.');
            error.code = 'noActiveMasterKey';
            throw error;
        }
        return id;
    }
    isMasterKeyLoaded(masterKey) {
        if (this.encryptedMasterKeys_.get(masterKey.id)) {
            return true;
        }
        const d = this.decryptedMasterKeys_.get(masterKey.id);
        if (!d)
            return false;
        return d.updatedTime === masterKey.updated_time;
    }
    async loadMasterKey(model, getPassword, makeActive = false) {
        if (!model.id)
            throw new Error('Master key does not have an ID - save it first');
        const loadKey = () => perfLogger.track('EncryptionService/loadKey', async () => {
            logger.info(`Loading master key: ${model.id}. Make active:`, makeActive);
            const password = typeof getPassword === 'string' ? getPassword : (await getPassword());
            if (!password) {
                logger.info(`Loading master key ${model.id} failed. No valid password found.`);
            }
            else {
                try {
                    this.decryptedMasterKeys_.set(model.id, {
                        plainText: await this.decryptMasterKeyContent(model, password),
                        updatedTime: model.updated_time,
                    });
                    if (makeActive)
                        this.setActiveMasterKeyId(model.id);
                }
                catch (error) {
                    logger.warn(`Cannot load master key ${model.id}. Invalid password?`, error);
                }
            }
            this.encryptedMasterKeys_.delete(model.id);
        });
        if (!makeActive) {
            this.encryptedMasterKeys_.set(model.id, {
                decrypt: loadKey,
                updatedTime: model.updated_time,
            });
        }
        else {
            await loadKey();
        }
    }
    unloadMasterKey(model) {
        this.decryptedMasterKeys_.delete(model.id);
        this.encryptedMasterKeys_.delete(model.id);
    }
    async loadedMasterKey(id) {
        const cachedKey = this.decryptedMasterKeys_.get(id);
        if (cachedKey)
            return cachedKey;
        const decryptCallback = this.encryptedMasterKeys_.get(id);
        if (decryptCallback) {
            // TODO: Handle invalid password errors?
            await decryptCallback.decrypt();
        }
        const key = this.decryptedMasterKeys_.get(id);
        if (!key) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            const error = new Error(`Master key is not loaded: ${id}`);
            error.code = 'masterKeyNotLoaded';
            error.masterKeyId = id;
            throw error;
        }
        return key;
    }
    loadedMasterKeyIds() {
        return [...this.decryptedMasterKeys_.keys(), ...this.encryptedMasterKeys_.keys()];
    }
    fsDriver() {
        if (!EncryptionService.fsDriver_)
            throw new Error('EncryptionService.fsDriver_ not set!');
        return EncryptionService.fsDriver_;
    }
    sha256(string) {
        const sjcl = shim_1.default.sjclModule;
        const bitArray = sjcl.hash.sha256.hash(string);
        return sjcl.codec.hex.fromBits(bitArray);
    }
    async generateApiToken() {
        return await this.randomHexString(64);
    }
    async randomHexString(byteCount) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const bytes = await shim_1.default.randomBytes(byteCount);
        return bytes
            .map(a => {
            return hexPad(a.toString(16), 2);
        })
            .join('');
    }
    masterKeysThatNeedUpgrading(masterKeys) {
        return MasterKey_1.default.allWithoutEncryptionMethod(masterKeys, [this.defaultMasterKeyEncryptionMethod_, EncryptionMethod.Custom]);
    }
    async reencryptMasterKey(model, decryptionPassword, encryptionPassword, decryptOptions = null, encryptOptions = null) {
        const newEncryptionMethod = this.defaultMasterKeyEncryptionMethod_;
        const plainText = await this.decryptMasterKeyContent(model, decryptionPassword, decryptOptions);
        const newContent = await this.encryptMasterKeyContent(newEncryptionMethod, plainText, encryptionPassword, encryptOptions);
        return Object.assign(Object.assign({}, model), newContent);
    }
    async encryptMasterKeyContent(encryptionMethod, hexaBytes, password, options = null) {
        options = Object.assign({}, options);
        if (encryptionMethod === null)
            encryptionMethod = this.defaultMasterKeyEncryptionMethod_;
        if (options.encryptionHandler) {
            return {
                checksum: '',
                encryption_method: EncryptionMethod.Custom,
                content: await options.encryptionHandler.encrypt(options.encryptionHandler.context, hexaBytes, password),
            };
        }
        else {
            return {
                // Checksum is not necessary since decryption will already fail if data is invalid
                checksum: encryptionMethod === EncryptionMethod.SJCL2 ? this.sha256(hexaBytes) : '',
                encryption_method: encryptionMethod,
                content: await this.encrypt(encryptionMethod, password, hexaBytes),
            };
        }
    }
    async generateMasterKeyContent_(password, options = null) {
        options = Object.assign({ encryptionMethod: this.defaultMasterKeyEncryptionMethod_ }, options);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const bytes = await shim_1.default.randomBytes(256);
        const hexaBytes = bytes.map(a => hexPad(a.toString(16), 2)).join('');
        return this.encryptMasterKeyContent(options.encryptionMethod, hexaBytes, password, options);
    }
    async generateMasterKey(password, options = null) {
        const model = await this.generateMasterKeyContent_(password, options);
        const now = Date.now();
        model.created_time = now;
        model.updated_time = now;
        model.source_application = Setting_1.default.value('appId');
        model.hasBeenUsed = false;
        return model;
    }
    async decryptMasterKeyContent(model, password, options = null) {
        options = options || {};
        if (model.encryption_method === EncryptionMethod.Custom) {
            if (!options.encryptionHandler)
                throw new Error('Master key was encrypted using a custom method, but no encryptionHandler is provided');
            return options.encryptionHandler.decrypt(options.encryptionHandler.context, model.content, password);
        }
        const plainText = await this.decrypt(model.encryption_method, password, model.content);
        if (model.encryption_method === EncryptionMethod.SJCL2) {
            const checksum = this.sha256(plainText);
            if (checksum !== model.checksum)
                throw new Error('Could not decrypt master key (checksum failed)');
        }
        return plainText;
    }
    async checkMasterKeyPassword(model, password) {
        const task = perfLogger.taskStart('EncryptionService/checkMasterKeyPassword');
        try {
            await this.decryptMasterKeyContent(model, password);
        }
        catch (error) {
            return false;
        }
        finally {
            task.onEnd();
        }
        return true;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    wrapSjclError(sjclError) {
        const error = new Error(sjclError.message);
        error.stack = sjclError.stack;
        return error;
    }
    async encrypt(method, key, plainText) {
        if (!method)
            throw new Error('Encryption method is required');
        if (!key)
            throw new Error('Encryption key is required');
        const sjcl = shim_1.default.sjclModule;
        const crypto = shim_1.default.crypto;
        const handlers = {
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
                }
                catch (error) {
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
                }
                catch (error) {
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
                }
                catch (error) {
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
                }
                catch (error) {
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
                }
                catch (error) {
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
                }
                catch (error) {
                    throw this.wrapSjclError(error);
                }
            },
            // New encryption method powered by native crypto libraries(node:crypto/react-native-quick-crypto). Using AES-256-GCM and pbkdf2
            // The master key is not directly used. A new data key is generated from the master key and a 256 bits random salt to prevent nonce reuse problem
            // 2024-08: Set iteration count in pbkdf2 to 220000 as suggested by OWASP. https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#pbkdf2
            [EncryptionMethod.KeyV1]: async () => {
                return JSON.stringify(await crypto.encryptString(key, await crypto.digest(types_1.Digest.sha256, this.encryptionNonce_), plainText, 'hex', {
                    cipherAlgorithm: types_1.CipherAlgorithm.AES_256_GCM,
                    authTagLength: 16,
                    digestAlgorithm: types_1.Digest.sha512,
                    keyLength: 32,
                    associatedData: emptyUint8Array,
                    iterationCount: 220000,
                }));
            },
            // New encryption method powered by native crypto libraries(node:crypto/react-native-quick-crypto). Using AES-256-GCM and pbkdf2
            // The master key is not directly used. A new data key is generated from the master key and a 256 bits random salt to prevent nonce reuse problem
            // The file content is base64 encoded. Decoding it before encryption to reduce the size overhead.
            [EncryptionMethod.FileV1]: async () => {
                return JSON.stringify(await crypto.encryptString(key, await crypto.digest(types_1.Digest.sha256, this.encryptionNonce_), plainText, 'base64', {
                    cipherAlgorithm: types_1.CipherAlgorithm.AES_256_GCM,
                    authTagLength: 16,
                    digestAlgorithm: types_1.Digest.sha512,
                    keyLength: 32,
                    associatedData: emptyUint8Array,
                    iterationCount: 3,
                }));
            },
            // New encryption method powered by native crypto libraries(node:crypto/react-native-quick-crypto). Using AES-256-GCM and pbkdf2
            // The master key is not directly used. A new data key is generated from the master key and a 256 bits random salt to prevent nonce reuse problem
            [EncryptionMethod.StringV1]: async () => {
                return JSON.stringify(await crypto.encryptString(key, await crypto.digest(types_1.Digest.sha256, this.encryptionNonce_), plainText, 'utf16le', {
                    cipherAlgorithm: types_1.CipherAlgorithm.AES_256_GCM,
                    authTagLength: 16,
                    digestAlgorithm: types_1.Digest.sha512,
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
    async decrypt(method, key, cipherText) {
        if (!method)
            throw new Error('Encryption method is required');
        if (!key)
            throw new Error('Encryption key is required');
        const sjcl = shim_1.default.sjclModule;
        const crypto = shim_1.default.crypto;
        if (method === EncryptionMethod.KeyV1) {
            return (await crypto.decrypt(key, JSON.parse(cipherText), {
                cipherAlgorithm: types_1.CipherAlgorithm.AES_256_GCM,
                authTagLength: 16,
                digestAlgorithm: types_1.Digest.sha512,
                keyLength: 32,
                associatedData: emptyUint8Array,
                iterationCount: 220000,
            })).toString('hex');
        }
        else if (method === EncryptionMethod.FileV1) {
            return (await crypto.decrypt(key, JSON.parse(cipherText), {
                cipherAlgorithm: types_1.CipherAlgorithm.AES_256_GCM,
                authTagLength: 16,
                digestAlgorithm: types_1.Digest.sha512,
                keyLength: 32,
                associatedData: emptyUint8Array,
                iterationCount: 3,
            })).toString('base64');
        }
        else if (method === EncryptionMethod.StringV1) {
            return (await crypto.decrypt(key, JSON.parse(cipherText), {
                cipherAlgorithm: types_1.CipherAlgorithm.AES_256_GCM,
                authTagLength: 16,
                digestAlgorithm: types_1.Digest.sha512,
                keyLength: 32,
                associatedData: emptyUint8Array,
                iterationCount: 3,
            })).toString('utf16le');
        }
        else if (this.isValidSjclEncryptionMethod(method)) {
            try {
                const output = sjcl.json.decrypt(key, cipherText);
                if (method === EncryptionMethod.SJCL1a || method === EncryptionMethod.SJCL1b) {
                    return unescape(output);
                }
                else {
                    return output;
                }
            }
            catch (error) {
                // SJCL returns a string as error which means stack trace is missing so convert to an error object here
                throw new Error(error.message);
            }
        }
        else {
            throw new Error(`Unknown decryption method: ${method}`);
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async encryptAbstract_(source, destination, options = null) {
        options = Object.assign({ encryptionMethod: this.defaultEncryptionMethod() }, options);
        const method = options.encryptionMethod;
        const masterKeyId = options.masterKeyId ? options.masterKeyId : this.activeMasterKeyId();
        const masterKeyPlainText = (await this.loadedMasterKey(masterKeyId)).plainText;
        const chunkSize = this.chunkSize(method);
        const crypto = shim_1.default.crypto;
        const header = {
            encryptionMethod: method,
            masterKeyId: masterKeyId,
        };
        await destination.append(this.encodeHeader_(header));
        let doneSize = 0;
        while (true) {
            const block = await source.read(chunkSize);
            if (!block)
                break;
            doneSize += chunkSize;
            if (options.onProgress)
                options.onProgress({ doneSize: doneSize });
            // Wait for a frame so that the app remains responsive in mobile.
            // https://corbt.com/posts/2015/12/22/breaking-up-heavy-processing-in-react-native.html
            await shim_1.default.waitForFrame();
            const encrypted = await this.encrypt(method, masterKeyPlainText, block);
            await crypto.increaseNonce(this.encryptionNonce_);
            await destination.append(padLeft(encrypted.length.toString(16), 6, '0'));
            await destination.append(encrypted);
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async decryptAbstract_(source, destination, options = null) {
        if (!options)
            options = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const header = await this.decodeHeaderSource_(source);
        const masterKeyPlainText = (await this.loadedMasterKey(header.masterKeyId)).plainText;
        let doneSize = 0;
        while (true) {
            const lengthHex = await source.read(6);
            if (!lengthHex)
                break;
            if (lengthHex.length !== 6)
                throw new Error(`Invalid block size: ${lengthHex}`);
            const length = parseInt(lengthHex, 16);
            if (!length)
                continue; // Weird but could be not completely invalid (block of size 0) so continue decrypting
            doneSize += length;
            if (options.onProgress)
                options.onProgress({ doneSize: doneSize });
            await shim_1.default.waitForFrame();
            const block = await source.read(length);
            const plainText = await this.decrypt(header.encryptionMethod, masterKeyPlainText, block);
            await destination.append(plainText);
        }
    }
    stringReader_(string, sync = false) {
        const reader = {
            index: 0,
            read: function (size) {
                const output = string.substr(reader.index, size);
                reader.index += size;
                return !sync ? Promise.resolve(output) : output;
            },
            close: function () { },
        };
        return reader;
    }
    stringWriter_() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const output = {
            data: [],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            append: async function (data) {
                output.data.push(data);
            },
            result: function () {
                return output.data.join('');
            },
            close: function () { },
        };
        return output;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async fileReader_(path, encoding) {
        const handle = await this.fsDriver().open(path, 'r');
        const reader = {
            handle: handle,
            read: async (size) => {
                return this.fsDriver().readFileChunk(reader.handle, size, encoding);
            },
            close: async () => {
                await this.fsDriver().close(reader.handle);
            },
        };
        return reader;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async fileWriter_(path, encoding) {
        return {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            append: async (data) => {
                return this.fsDriver().appendFile(path, data, encoding);
            },
            close: function () { },
        };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async encryptString(plainText, options = null) {
        const source = this.stringReader_(plainText);
        const destination = this.stringWriter_();
        await this.encryptAbstract_(source, destination, options);
        return destination.result();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async decryptString(cipherText, options = null) {
        const source = this.stringReader_(cipherText);
        const destination = this.stringWriter_();
        await this.decryptAbstract_(source, destination, options);
        return destination.data.join('');
    }
    async encryptFile(srcPath, destPath, options = null) {
        options = Object.assign({ encryptionMethod: this.defaultFileEncryptionMethod() }, options);
        let source = await this.fileReader_(srcPath, 'base64');
        let destination = await this.fileWriter_(destPath, 'ascii');
        const cleanUp = async () => {
            if (source)
                await source.close();
            if (destination)
                await destination.close();
            // eslint-disable-next-line require-atomic-updates
            source = null;
            // eslint-disable-next-line require-atomic-updates
            destination = null;
        };
        try {
            await this.fsDriver().unlink(destPath);
            await this.encryptAbstract_(source, destination, options);
        }
        catch (error) {
            await cleanUp();
            await this.fsDriver().unlink(destPath);
            throw error;
        }
        await cleanUp();
    }
    async decryptFile(srcPath, destPath, options = null) {
        let source = await this.fileReader_(srcPath, 'ascii');
        let destination = await this.fileWriter_(destPath, 'base64');
        const cleanUp = async () => {
            if (source)
                await source.close();
            if (destination)
                await destination.close();
            // eslint-disable-next-line require-atomic-updates
            source = null;
            // eslint-disable-next-line require-atomic-updates
            destination = null;
        };
        try {
            await this.fsDriver().unlink(destPath);
            await this.decryptAbstract_(source, destination, options);
        }
        catch (error) {
            await cleanUp();
            await this.fsDriver().unlink(destPath);
            throw error;
        }
        await cleanUp();
    }
    headerTemplate(version) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const r = this.headerTemplates_[version];
        if (!r)
            throw new Error(`Unknown header version: ${version}`);
        return r;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    encodeHeader_(header) {
        // Sanity check
        if (header.masterKeyId.length !== 32)
            throw new Error(`Invalid master key ID size: ${header.masterKeyId}`);
        let encryptionMetadata = '';
        encryptionMetadata += padLeft(header.encryptionMethod.toString(16), 2, '0');
        encryptionMetadata += header.masterKeyId;
        encryptionMetadata = padLeft(encryptionMetadata.length.toString(16), 6, '0') + encryptionMetadata;
        return `JED01${encryptionMetadata}`;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async decodeHeaderString(cipherText) {
        const source = this.stringReader_(cipherText);
        return this.decodeHeaderSource_(source);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async decodeHeaderSource_(source) {
        const identifier = await source.read(5);
        if (!isValidHeaderIdentifier(identifier))
            throw new JoplinError_1.default(`Invalid encryption identifier. Data is not actually encrypted? ID was: ${identifier}`, 'invalidIdentifier');
        const mdSizeHex = await source.read(6);
        const mdSize = parseInt(mdSizeHex, 16);
        if (isNaN(mdSize) || !mdSize)
            throw new Error(`Invalid header metadata size: ${mdSizeHex}`);
        const md = await source.read(parseInt(mdSizeHex, 16));
        return this.decodeHeaderBytes_(identifier + mdSizeHex + md);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    decodeHeaderBytes_(headerHexaBytes) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const reader = this.stringReader_(headerHexaBytes, true);
        const identifier = reader.read(3);
        const version = parseInt(reader.read(2), 16);
        if (identifier !== 'JED')
            throw new Error(`Invalid header (missing identifier): ${headerHexaBytes.substr(0, 64)}`);
        const template = this.headerTemplate(version);
        parseInt(reader.read(6), 16); // Read the size and move the reader pointer forward
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const output = {};
        for (let i = 0; i < template.fields.length; i++) {
            const m = template.fields[i];
            const name = m[0];
            const size = m[1];
            const type = m[2];
            let v = reader.read(size);
            if (type === 'int') {
                v = parseInt(v, 16);
            }
            else if (type === 'hex') {
                // Already in hexa
            }
            else {
                throw new Error(`Invalid type: ${type}`);
            }
            output[name] = v;
        }
        return output;
    }
    isValidSjclEncryptionMethod(method) {
        return [EncryptionMethod.SJCL, EncryptionMethod.SJCL1a, EncryptionMethod.SJCL1b, EncryptionMethod.SJCL2, EncryptionMethod.SJCL3, EncryptionMethod.SJCL4].indexOf(method) >= 0;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async itemIsEncrypted(item) {
        if (!item)
            throw new Error('No item');
        const ItemClass = BaseItem_1.default.itemClass(item);
        if (!ItemClass.encryptionSupported())
            return false;
        return item.encryption_applied && isValidHeaderIdentifier(item.encryption_cipher_text, true);
    }
    async fileIsEncrypted(path) {
        const handle = await this.fsDriver().open(path, 'r');
        const headerIdentifier = await this.fsDriver().readFileChunk(handle, 5, 'ascii');
        await this.fsDriver().close(handle);
        return isValidHeaderIdentifier(headerIdentifier);
    }
}
EncryptionService.instance_ = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
EncryptionService.fsDriver_ = null;
exports.default = EncryptionService;
