# Native Encryption Method Specification

Starting with Joplin v3.2, we introduced a series of new encryption methods. These methods are built on native libraries and are designed to enhance both performance and security. This document provides an overview and detailed specifications of these new encryption methods.

**Related Links:**</br>
[GitHub Pull Request](https://github.com/laurent22/joplin/pull/10696)</br>
[GSoC Final Report](https://discourse.joplinapp.org/t/final-report-of-the-native-encryption-project/40171)</br>

## 1. General Steps for Encryption/Decryption
### 1.1. Encryption Steps:
```mermaid
graph LR;
    pwd[Master<br/>Password]
    mk[Master Key]
    emk[Encrypted<br/>Master Key]
    enc_1(("EncryptionService<br/>.encrypt()"))
    sync[(Sync Target)]
    pt[Notes/Resources]
    enc_2(("EncryptionService<br/>.encrypt()"))
    ct[Encrypted<br/>Notes/Resources]

    mk-->enc_1
    mk-->enc_2
    subgraph Master Key Encryption
        pwd-->enc_1
        enc_1-->emk
    end
    subgraph Data Encryption
        pt-->enc_2
        enc_2-->ct
    end
    emk-->sync
    ct-->sync
```

### 1.2. Decryption Steps: 
```mermaid
graph LR;
    pwd[Master<br/>Password]
    mk[Master Key]
    emk[Encrypted<br/>Master Key]
    dec_1(("EncryptionService<br/>.decrypt()"))
    sync[(Sync Target)]
    pt[Notes/Resources]
    dec_2(("EncryptionService<br/>.decrypt()"))
    ct[Encrypted<br/>Notes/Resources]

    sync-->ct
    sync-->emk
    subgraph Master Key Decryption
        pwd-->dec_1
        emk-->dec_1
        dec_1-->mk
    end
    subgraph Data Decryption
        mk-->dec_2
        ct-->dec_2
        dec_2-->pt
    end
```
### 1.3. Explanations
- **Master Password**: The user-provided password used to encrypt the Master Key.
- **Master Key**: A randomly generated 256-byte (2048-bit) key used to encrypt notes and resources. This is also called the `Data Key` in [this document](https://github.com/laurent22/joplin/blob/dev/readme/dev/spec/e2ee/workflow.md).
- **Master Key Encryption/Decryption**: In these parts, the Master Key is encrypted or decrypted using the Master Password.
- **Data Encryption/Decryption**: In these parts, notes and resources are encrypted or decrypted using the Master Key.

The Master Password is stored locally in the database and is never updated to the Sync Target. As a result, third-party Sync Targets cannot decrypt the Master Key, notes or resources.

## 2. General Implementation for `encrypt()` and `decrypt()`
### 2.1. encrypt():
```mermaid
graph LR;
    pwd[Password]
    salt[Salt]
    kdf((KDF))
    key[Key]

    pt_str["Plaintext<br/>(string)"]
    pt_bin["Plaintext<br/>(binary)"]
    ct_str["Ciphertext<br/>(string)"]
    ct_bin["Ciphertext<br/>(binary)"]
    cipher((Cipher))
    codec_1((Encoder/<br/>Decoder))
    codec_2((Encoder/<br/>Decoder))

    pwd---salt
    pt_str---salt
    linkStyle 0,1 stroke-width:0px

    pwd-->kdf
    pt_str-->codec_1

    subgraph sub_1 ["EncryptionService.encrypt()"]
    direction LR
        codec_1-->pt_bin
        pt_bin-->cipher
        salt-->kdf
        kdf-->key
        key-->cipher
        cipher-->ct_bin
        ct_bin-->codec_2
    end
    codec_2-->ct_str
```
### 2.2. decrypt():
```mermaid
graph LR;
    pwd[Password]
    salt[Salt]
    kdf((KDF))
    key[Key]

    pt_str["Plaintext<br/>(string)"]
    pt_bin["Plaintext<br/>(binary)"]
    ct_str["Ciphertext<br/>(string)"]
    ct_bin["Ciphertext<br/>(binary)"]
    decipher((Decipher))
    codec_1((Encoder/<br/>Decoder))
    codec_2((Encoder/<br/>Decoder))

    pwd---salt
    ct_str---salt
    linkStyle 0,1 stroke-width:0px

    pwd-->kdf
    ct_str-->codec_1

    subgraph sub_1 ["EncryptionService.decrypt()"]
    direction LR
        codec_1-->ct_bin
        ct_bin-->decipher
        salt-->kdf
        kdf-->key
        key-->decipher
        decipher-->pt_bin
        pt_bin-->codec_2
    end
    codec_2-->pt_str
```
### 2.3. Explanations
(In this section, `encrypt()` and `decrypt()` refer to `EncryptionService.encrypt()` and `EncryptionService.decrypt()` respectively.)</br>
- **KDF**: Key Derivation Function, used to derive cryptographically strong keys from passwords.
- **Encoder/Decoder**: The `encrypt()` and `decrypt()` methods take strings as input and produce strings as output. Since the cipher operates on binary data and generates binary outputs, encoders and decoders are used to convert between strings and binary data.
- **KDF (Key Derivation Function)**: The `encrypt()` and `decrypt()` methods are designed for password-based encryption, but passwords may not meet cryptographic key strength requirements. The KDF addresses this by taking a password and a salt as inputs and generating a secure cryptographic key for the actual encryption process.
- **Salt**: The salt is managed internally by the `encrypt()` and `decrypt()` methods (or more generally, within the `EncryptionService`), so callers don't need to handle it explicitly.
## 3. Specifications for the New Native Encryption Methods
### 3.1. Encryption Flow
The expanded flow is shown below. Some of the elements have been replaced with the specific implementation compared with the general implementation graphs. Additionally, extra elements have been introduced for the chosen cipher.

```mermaid
graph LR;
    pwd[Password]
    salt[Salt]
    kdf((PBKDF2))
    key[Key]

    pt_str["Plaintext<br/>(string)"]
    pt_bin["Plaintext<br/>(binary)"]
    ct_str["Ciphertext<br/>(string)"]
    ct_bin["Ciphertext<br/>(binary)"]
    iv[Initialization Vector]
    adata[Associated Data]
    atag[Authentication Tag]
    cipher((AES-256-GCM))
    codec((Encoder/<br/>Decoder))
    b64enc((Base64<br/>Encoder))

    pwd---salt
    pt_str---salt
    linkStyle 0,1 stroke-width:0px

    pwd-->kdf
    pt_str-->codec

    subgraph sub_1 ["EncryptionService.encrypt()"]
    direction LR
        codec-->pt_bin
        pt_bin-->cipher
        salt-->kdf
        kdf-->key
        key-->cipher
        iv-->cipher
        adata-->cipher
        cipher-->ct_bin
        ct_bin-->b64enc
        cipher-->atag
    end
    b64enc-->ct_str
```
### 3.2. Decryption Flow
The decryption flow is similar to the encryption flow.

```mermaid
graph LR;
    pwd[Password]
    salt[Salt]
    kdf((PBKDF2))
    key[Key]

    pt_str["Plaintext<br/>(string)"]
    pt_bin["Plaintext<br/>(binary)"]
    ct_str["Ciphertext<br/>(string)"]
    ct_bin["Ciphertext<br/>(binary)"]
    iv[Initialization Vector]
    adata[Associated Data]
    atag[Authentication Tag]
    decipher((AES-256-GCM))
    codec((Encoder/<br/>Decoder))
    b64dec((Base64<br/>Decoder))

    pwd---salt
    ct_str---salt
    linkStyle 0,1 stroke-width:0px

    pwd-->kdf
    ct_str-->b64dec

    subgraph sub_1 ["EncryptionService.decrypt()"]
    direction LR
        b64dec-->ct_bin
        ct_bin-->decipher
        salt-->kdf
        kdf-->key
        key-->decipher
        iv-->decipher
        adata-->decipher
        atag-->decipher
        decipher-->pt_bin
        pt_bin-->codec
    end
    codec-->pt_str
```
### 3.3. Encoder/Decoder
Different encoders/decoders are used for different types of plaintext:

| Method Name | Plaintext Type | Encoder |
|---|---|---|
| KeyV1 | Master Key | Hex String Decoder |
| StringV1 | Note Content | UTF-16 Encoder |
| FileV1 | Resources (Files) | Base64 String Decoder |

- For `KeyV1` and `FileV1`, the plaintext is initially binary but is encoded as strings to work with `encrypt()` and `decrypt()`, which operate only on strings. Before encryption, a proper decoder converts these strings back to their original binary form. This resolves the double Base64 encoding issue in the old encryption methods, resulting in smaller ciphertext.
- For `StringV1`, UTF-16 encoding ensures compatibility with all possible JavaScript characters.

### 3.4. PBKDF2 Parameters
PBKDF2 is used as the KDF for its compatibility across all platforms. The parameters are listed below:

<table>
    <tbody>
        <tr>
            <td>Method Name</td><td>Algorithm</td><td>Iteration Count</td><td>Salt</td><td>Output Key Length</td>
        </tr>
        <tr>
            <td>KeyV1</td>
            <td rowspan="3">PBKDF2-HMAC-SHA512</td>
            <td>220000</td>
            <td rowspan="3">256-bit Generated Salt</td>
            <td rowspan="3">256 Bits</td>
        </tr>
        <tr>
            <td>StringV1</td>
            <td rowspan="2">3</td>
        </tr>
        <tr>
            <td>FileV1</td>
        </tr>
    </tbody>
</table>

The iteration count of `KeyV1` follows [OWASP recommendations](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#pbkdf2). For `StringV1` and `FileV1`, the randomly generated Master Key already provides sufficient cryptographic strength so the low iteration count is acceptable.</br>
However, applying the KDF to the Master Key is still necessary to resolve the short IV problem in the AES-GCM cipher. The details are provided in [Section 3.6](#36-extended-equivalent-nonce).</br>

### 3.5. Cipher/Decipher Parameters
The parameters for the cipher `AES-256-GCM`, used in all three new encryption methods (`KeyV1`, `StringV1`, `FileV1`), are listed below:

| Parameter | Value |
|---|---|
| Cipher/Decipher | AES |
| Mode | GCM |
| Key Length | 256 Bits |
| Initialization Vector | 96-bit Random Bytes |
| Associated Data | (Empty) |
| Authentication Tag Length | 128 Bits |

The Initialization Vector (IV) length is set to 96 bits because extending it doesn't improve the cryptographic strength. Actually, the low-level implementation of AES-GCM always reduces longer IVs to 96 bits.

### 3.6. Extended Equivalent Nonce
Although AES-GCM has been used in TLS for years and has not shown significant vulnerabilities, there are still some security considerations:</br>
- The Galois Counter Mode (GCM) is vulnerable when the IV and key is reused.
- While a simple counter could serve as the IV, it's not easy to maintain a reliable monotonic counter across all clients.
- The AES-GCM cipher has a maximum IV length of 96 bits (as discussed in [Section 3.5](#35-cipherdecipher-parameters)
), which is relatively short.

Although unlikely, a Joplin user could run into two pieces of ciphertext encrypted with the same IV even if the IV is randomly generated. This cause security vulnerabilities if the notes and resources is encrypted with the same Master Key directly. To resolve this, a 256-bit generated salt is used for each encryption to derive a new encryption key from the Master Key, so the key passed to the cipher changes every time. In theory, this approach provides a equivalent nonce with a length of (256+96) bits.

The salt is generated using the following formula:

```
encryptionNonce = concat(<168-bit Random Data>, <64-bit Timestamp in ms>, <56-bit Counter Value>)
salt = sha256(encryptionNonce)
```
- The `encryptionNonce` is generated when the app starts or when the 56-bit counter overflows.
- The counter increases with each encryption operation.

## 4. Dependencies
- **Desktop/CLI Client**: `Web Crypto API` provided by Node.js
- **Web Client**: `Web Crypto API` provided by the browsers
- **Mobile Client**: `react-native-quick-crypto`
