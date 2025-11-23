"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CipherAlgorithm = exports.Digest = exports.PublicKeyAlgorithm = void 0;
var PublicKeyAlgorithm;
(function (PublicKeyAlgorithm) {
    PublicKeyAlgorithm["Unknown"] = "unknown";
    PublicKeyAlgorithm["RsaV1"] = "rsa-v1";
    PublicKeyAlgorithm["RsaV2"] = "rsa-v2";
    PublicKeyAlgorithm["RsaV3"] = "rsa-v3";
})(PublicKeyAlgorithm || (exports.PublicKeyAlgorithm = PublicKeyAlgorithm = {}));
// A subset of react-native-quick-crypto.HashAlgorithm, supported by Web Crypto API
var Digest;
(function (Digest) {
    Digest["sha1"] = "SHA-1";
    Digest["sha256"] = "SHA-256";
    Digest["sha384"] = "SHA-384";
    Digest["sha512"] = "SHA-512";
})(Digest || (exports.Digest = Digest = {}));
var CipherAlgorithm;
(function (CipherAlgorithm) {
    CipherAlgorithm["AES_128_GCM"] = "aes-128-gcm";
    CipherAlgorithm["AES_192_GCM"] = "aes-192-gcm";
    CipherAlgorithm["AES_256_GCM"] = "aes-256-gcm";
})(CipherAlgorithm || (exports.CipherAlgorithm = CipherAlgorithm = {}));
