import { CryptoBuffer } from './types';

const nonceCounterLength = 8;
const nonceTimestampLength = 7;

type RandomBytesImplementation = (size: number)=> Promise<CryptoBuffer>;

let randomBytesImplementation: RandomBytesImplementation = null;

export const setRandomBytesImplementation = (implementation: RandomBytesImplementation) => {
	randomBytesImplementation = implementation;
};

export const generateNonce = async (nonce: Uint8Array) => {
	const randomLength = nonce.length - nonceTimestampLength - nonceCounterLength;
	if (randomLength < 1) {
		throw new Error(`Nonce length should be greater than ${(nonceTimestampLength + nonceCounterLength) * 8} bits`);
	}
	nonce.set(await randomBytesImplementation(randomLength));
	const timestampArray = new Uint8Array(nonceTimestampLength);
	let timestamp = Date.now();
	for (let i = 0; i < nonceTimestampLength; i++) {
		timestampArray[i] = timestamp & 0xFF;
		timestamp >>= 8;
	}
	nonce.set(timestampArray, randomLength);
	nonce.set(new Uint8Array(nonceCounterLength), randomLength + nonceTimestampLength);
	return nonce;
};

export const increaseNonce = async (nonce: Uint8Array) => {
	const carry = 1;
	const end = nonce.length - nonceCounterLength;
	let i = nonce.length;
	while (i-- > end) {
		nonce[i] += carry;
		if (nonce[i] !== 0 || carry !== 1) {
			break;
		}
	}
	if (i < end) {
		await generateNonce(nonce);
	}
	return nonce;
};
