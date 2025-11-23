"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldUpdatePpk = exports.generateKeyPairWithAlgorithm = exports.supportsPpkAlgorithm = exports.getPpkAlgorithm = exports.rsa = exports.setRSA = exports.testing__setPpkMigrations_ = exports.getDefaultPpkAlgorithm = void 0;
exports.decryptPrivateKey = decryptPrivateKey;
exports.generateKeyPair = generateKeyPair;
exports.pkReencryptPrivateKey = pkReencryptPrivateKey;
exports.ppkPasswordIsValid = ppkPasswordIsValid;
exports.ppkGenerateMasterKey = ppkGenerateMasterKey;
exports.ppkDecryptMasterKeyContent = ppkDecryptMasterKeyContent;
exports.mkReencryptFromPasswordToPublicKey = mkReencryptFromPasswordToPublicKey;
exports.mkReencryptFromPublicKeyToPassword = mkReencryptFromPublicKeyToPassword;
const uuid_1 = require("../../../uuid");
const EncryptionService_1 = require("../EncryptionService");
const types_1 = require("../types");
const PerformanceLogger_1 = require("../../../PerformanceLogger");
const perfLogger = PerformanceLogger_1.default.create();
// To indicate that clients should migrate to a new PublicKeyAlgorithm, add it to the end of
// "ppkMigrations".
let ppkMigrations = [
    types_1.PublicKeyAlgorithm.RsaV1,
    // Uncomment to migrate to RsaV2, which uses a different padding type from RsaV1
    // PublicKeyAlgorithm.RsaV2,
    // Uncomment to migrate to RsaV3, which uses different encryption libraries, padding type,
    // and a larger key size. Before migrating:
    // - Check whether generating keys with this method still blocks the UI on Android/iOS
    //   (it might not after migrating to React Native's New Architecture).
    // PublicKeyAlgorithm.RsaV3,
];
const getDefaultPpkAlgorithm = () => ppkMigrations[ppkMigrations.length - 1];
exports.getDefaultPpkAlgorithm = getDefaultPpkAlgorithm;
// Exported for testing purposes
const testing__setPpkMigrations_ = (migrations) => {
    const original = ppkMigrations;
    ppkMigrations = migrations;
    return {
        reset: () => {
            ppkMigrations = original;
        },
    };
};
exports.testing__setPpkMigrations_ = testing__setPpkMigrations_;
let rsa_ = null;
const setRSA = (rsa) => {
    rsa_ = rsa;
};
exports.setRSA = setRSA;
const supportsAlgorithm = (algorithm) => {
    return Object.prototype.hasOwnProperty.call(rsa_, algorithm);
};
// Exported for testing purposes
const rsa = (algorithm) => {
    if (!rsa_)
        throw new Error('RSA handler has not been set!!');
    if (!supportsAlgorithm(algorithm))
        throw new Error(`Unsupported algorithm: ${algorithm}`);
    return rsa_[algorithm];
};
exports.rsa = rsa;
// Non-legacy encryption methods prefix the public key with the algorithm.
// For example "[rsa-v2]...some-public-key-here..."
// This function extracts the algorithm prefix from the given raw public key.
const splitPpkPublicKey = (publicKey) => {
    const algorithmMatch = publicKey.match(/^([^; ]+;)/);
    let algorithm = types_1.PublicKeyAlgorithm.RsaV1;
    if (algorithmMatch) {
        const algorithmNameAndSeparator = algorithmMatch[0];
        const algorithmName = algorithmNameAndSeparator.replace(/[;]$/, '');
        if (Object.values(types_1.PublicKeyAlgorithm).includes(algorithmName)) {
            algorithm = algorithmName;
        }
        else {
            algorithm = types_1.PublicKeyAlgorithm.Unknown;
        }
        publicKey = publicKey.substring(algorithmNameAndSeparator.length);
    }
    return { algorithm, publicKey };
};
const attachPpkAlgorithm = (publicKey, algorithm) => {
    // Legacy PPK format didn't include the algorithm in the public key:
    if (algorithm === types_1.PublicKeyAlgorithm.RsaV1) {
        return publicKey;
    }
    return `${algorithm};${publicKey}`;
};
const getPpkAlgorithm = (ppk) => {
    return splitPpkPublicKey(ppk.publicKey).algorithm;
};
exports.getPpkAlgorithm = getPpkAlgorithm;
const supportsPpkAlgorithm = (ppk) => {
    return supportsAlgorithm((0, exports.getPpkAlgorithm)(ppk));
};
exports.supportsPpkAlgorithm = supportsPpkAlgorithm;
async function encryptPrivateKey(encryptionService, password, plainText) {
    return {
        encryptionMethod: EncryptionService_1.EncryptionMethod.SJCL4,
        ciphertext: await encryptionService.encrypt(EncryptionService_1.EncryptionMethod.SJCL4, password, plainText),
    };
}
async function decryptPrivateKey(encryptionService, encryptedKey, password) {
    return encryptionService.decrypt(encryptedKey.encryptionMethod, password, encryptedKey.ciphertext);
}
const generateKeyPairWithAlgorithm = async (algorithm, encryptionService, password) => {
    const { keyPair, keySize } = await perfLogger.track('ppk/generateKeyPair', () => ((0, exports.rsa)(algorithm).generateKeyPair()));
    return {
        id: uuid_1.default.createNano(),
        keySize,
        privateKey: await encryptPrivateKey(encryptionService, password, await (0, exports.rsa)(algorithm).privateKey(keyPair)),
        publicKey: attachPpkAlgorithm(await (0, exports.rsa)(algorithm).publicKey(keyPair), algorithm),
        createdTime: Date.now(),
    };
};
exports.generateKeyPairWithAlgorithm = generateKeyPairWithAlgorithm;
async function generateKeyPair(encryptionService, password) {
    return (0, exports.generateKeyPairWithAlgorithm)((0, exports.getDefaultPpkAlgorithm)(), encryptionService, password);
}
async function pkReencryptPrivateKey(encryptionService, ppk, decryptionPassword, encryptionPassword) {
    const decryptedPrivate = await decryptPrivateKey(encryptionService, ppk.privateKey, decryptionPassword);
    return Object.assign(Object.assign({}, ppk), { privateKey: await encryptPrivateKey(encryptionService, encryptionPassword, decryptedPrivate) });
}
async function ppkPasswordIsValid(service, ppk, password) {
    if (!ppk)
        throw new Error('PPK is undefined');
    try {
        await loadPpk(service, ppk, password);
    }
    catch (error) {
        return false;
    }
    return true;
}
const shouldUpdatePpk = (oldPpk) => {
    const algorithm = (0, exports.getPpkAlgorithm)(oldPpk);
    const migrationIndex = ppkMigrations.indexOf(algorithm);
    const isUpToDate = algorithm === (0, exports.getDefaultPpkAlgorithm)();
    return migrationIndex > -1 && !isUpToDate && supportsAlgorithm((0, exports.getDefaultPpkAlgorithm)());
};
exports.shouldUpdatePpk = shouldUpdatePpk;
async function loadKeys(publicKey, privateKeyPlainText, keySize) {
    const split = splitPpkPublicKey(publicKey);
    return (0, exports.rsa)(split.algorithm).loadKeys(split.publicKey, privateKeyPlainText, keySize);
}
async function loadPpk(service, ppk, password) {
    const privateKeyPlainText = await decryptPrivateKey(service, ppk.privateKey, password);
    return loadKeys(ppk.publicKey, privateKeyPlainText, ppk.keySize);
}
async function loadPublicKey(publicKey, keySize) {
    return loadKeys(publicKey, '', keySize);
}
function ppkEncryptionHandler(ppk, rsaKeyPair) {
    return {
        context: {
            rsaKeyPair,
            ppkId: ppk.id,
            algorithm: (0, exports.getPpkAlgorithm)(ppk),
        },
        encrypt: async (context, hexaBytes, _password) => {
            const ciphertextBuffer = await (0, exports.rsa)(context.algorithm).encrypt(hexaBytes, context.rsaKeyPair);
            return JSON.stringify({
                ppkId: context.ppkId,
                ciphertext: ciphertextBuffer.toString('base64'),
            });
        },
        decrypt: async (context, ciphertext, _password) => {
            const parsed = JSON.parse(ciphertext);
            if (parsed.ppkId !== context.ppkId)
                throw new Error(`Needs private key ${parsed.ppkId} to decrypt, but using ${context.ppkId}`);
            const cipherTextBuffer = Buffer.from(parsed.ciphertext, 'base64');
            return (0, exports.rsa)(context.algorithm).decrypt(cipherTextBuffer, context.rsaKeyPair);
        },
    };
}
// Generates a master key and encrypts it using the provided PPK
async function ppkGenerateMasterKey(service, ppk, password) {
    const nodeRSA = await loadPpk(service, ppk, password);
    const handler = ppkEncryptionHandler(ppk, nodeRSA);
    return service.generateMasterKey('', {
        encryptionMethod: EncryptionService_1.EncryptionMethod.Custom,
        encryptionHandler: handler,
    });
}
// Decrypt the content of a master key that was encrypted using ppkGenerateMasterKey()
async function ppkDecryptMasterKeyContent(service, masterKey, ppk, password) {
    const nodeRSA = await loadPpk(service, ppk, password);
    const handler = ppkEncryptionHandler(ppk, nodeRSA);
    return service.decryptMasterKeyContent(masterKey, '', {
        encryptionHandler: handler,
    });
}
async function mkReencryptFromPasswordToPublicKey(service, masterKey, decryptionPassword, encryptionPublicKey) {
    const loadedPublicKey = await loadPublicKey(encryptionPublicKey.publicKey, encryptionPublicKey.keySize);
    const encryptionHandler = ppkEncryptionHandler(encryptionPublicKey, loadedPublicKey);
    const plainText = await service.decryptMasterKeyContent(masterKey, decryptionPassword);
    const newContent = await service.encryptMasterKeyContent(EncryptionService_1.EncryptionMethod.Custom, plainText, '', { encryptionHandler });
    return Object.assign(Object.assign({}, masterKey), newContent);
}
async function mkReencryptFromPublicKeyToPassword(service, masterKey, decryptionPpk, decryptionPassword, encryptionPassword) {
    const decryptionHandler = ppkEncryptionHandler(decryptionPpk, await loadPpk(service, decryptionPpk, decryptionPassword));
    const plainText = await service.decryptMasterKeyContent(masterKey, '', { encryptionHandler: decryptionHandler });
    const newContent = await service.encryptMasterKeyContent(null, plainText, encryptionPassword);
    return Object.assign(Object.assign({}, masterKey), newContent);
}
