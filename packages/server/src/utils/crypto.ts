import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
const thirtyTwo = require('thirty-two');
import { totp } from 'otplib';
import config from '../config';

export function md5(string: string): string {
	return createHash('md5').update(string).digest('hex');
}

const outputEncoding = 'hex';
const algorithm = 'aes-256-gcm';

export const encryptMFASecret = (toBeEncrypted: Buffer, encryptionKey: string) => {
	const iv = randomBytes(12);
	const cipher = createCipheriv(algorithm, Buffer.from(encryptionKey, outputEncoding), iv);
	let encrypted = cipher.update(toBeEncrypted, undefined, outputEncoding);
	encrypted += cipher.final(outputEncoding);
	const authTag = cipher.getAuthTag();
	return `${iv.toString(outputEncoding)}${encrypted}${authTag.toString(outputEncoding)}`;
};

export const decryptMFASecret = (encryptedSecret: string, encryptionKey: string) => {
	const encryptedData = Buffer.from(encryptedSecret, outputEncoding);
	const iv = encryptedData.slice(0, 12);
	const authTag = encryptedData.slice(-16);
	const decipher = createDecipheriv(algorithm, Buffer.from(encryptionKey, outputEncoding), iv);
	decipher.setAuthTag(authTag);
	const decrypted = decipher.update(encryptedData.slice(12, -16));
	return Buffer.concat([decrypted, decipher.final()]);
};

export const checkConsecutiveMFACodes = (totpSecret: string, confirmCode1: string, confirmCode2: string) => {
	const decodedTotpSecret = thirtyTwo.decode(totpSecret);

	totp.options = {
		// Set epoch 30s in the past to verify if the first code is valid
		epoch: Date.now() - 30 * 1000,
	};
	const isVerified = totp.check(confirmCode1, decodedTotpSecret);

	totp.resetOptions();
	const isVerified2 = totp.check(confirmCode2, decodedTotpSecret);

	return isVerified && isVerified2;
};

export const isValidMFACode = (totpSecret: string, confirmCode: string) => {
	const decryptedSecret = decryptMFASecret(totpSecret, config().MFA_ENCRYPTION_KEY);
	return totp.verify({ token: confirmCode, secret: decryptedSecret.toString('binary') });
};
