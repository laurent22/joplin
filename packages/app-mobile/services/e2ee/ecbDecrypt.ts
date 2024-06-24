
// Provide both base64 and buffer data to improve performance. In some cases,
// the buffer data is already available and the base64 needs to be computed. In
// other cases, it's the other way around. Providing both allows us to make one
// a getter method and thus potentially improve performance.
type BlockData = {
	ciphertextBlockBase64: string;
	ciphertextBlockBuffer: Buffer;
};
type OnDecryptBlock = (block: BlockData)=>Promise<string>;


// Decrypts data using Electronic Code Book (ECB) mode, which matches node-rsa's decryption behavior.
// See their implementation for details: https://github.com/rzcoder/node-rsa/blob/e7e7f7d2942a3bac1d2e132a881e5a3aceda10a1/src/libs/rsa.js#L252
//
// Note: Avoid using ECB mode for large amounts of data (https://en.wikipedia.org/wiki/Block_cipher_mode_of_operation#Electronic_codebook_(ECB)).
//
// At present, this is used because master keys are longer than the default modulus size of 256 bytes.
const ecbDecrypt = async (ciphertextBase64: string, decryptBlock: OnDecryptBlock, rsaKeySizeBits: number) => {
	const ciphertextBuffer = Buffer.from(ciphertextBase64, 'base64');
	const maximumEncryptedSize = Math.floor(rsaKeySizeBits / 8); // Usually 256

	// On iOS, .decrypt fails without throwing or rejecting.
	// This function throws for consistency with Android.
	const handleError = (plainText: string|undefined) => {
		if (plainText === undefined) {
			throw new Error(`
				RN RSA: Decryption failed.
					cipherTextLength=${ciphertextBuffer.length},
					maxEncryptedSize=${maximumEncryptedSize}
			`.trim());
		}
	};

	if (ciphertextBuffer.length > maximumEncryptedSize) {
		// Use a numBlocks and blockSize that match node-rsa:
		const numBlocks = Math.ceil(ciphertextBuffer.length / maximumEncryptedSize);
		const blockSize = maximumEncryptedSize;

		const result: string[] = [];
		for (let i = 0; i < numBlocks; i++) {
			const ciphertextBlock = ciphertextBuffer.slice(
				i * blockSize, Math.min(ciphertextBuffer.length, (i + 1) * blockSize),
			);
			const plainText = await decryptBlock({
				ciphertextBlockBuffer: ciphertextBlock,
				get ciphertextBlockBase64() { return ciphertextBlock.toString('base64'); },
			});

			handleError(plainText);
			result.push(plainText);
		}
		return result.join('');
	} else {
		const plainText = await decryptBlock({
			get ciphertextBlockBuffer() { return Buffer.from(ciphertextBase64, 'base64'); },
			ciphertextBlockBase64: ciphertextBase64,
		});
		handleError(plainText);
		return plainText;
	}
};

export default ecbDecrypt;