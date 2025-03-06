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
	let timestampMsb = Math.floor(timestamp / 2 ** 32);
	const lsbCount = Math.min(4, nonceTimestampLength);
	for (let i = 0; i < lsbCount; i++) {
		timestampArray[i] = timestamp & 0xFF;
		timestamp >>>= 8;
	}
	// The bitwise operators in Typescript only take the 32 LSBs to calculate, so we need to extract the MSBs manually.
	for (let i = 4; i < nonceTimestampLength; i++) {
		timestampArray[i] = timestampMsb & 0xFF;
		timestampMsb >>>= 8;
	}
	nonce.set(timestampArray, randomLength);
	nonce.set(new Uint8Array(nonceCounterLength), randomLength + nonceTimestampLength);
	return nonce;
};

export const increaseNonce = async (nonce: Uint8Array) => {
	const end = nonce.length - nonceCounterLength;
	let i = nonce.length;
	while (i-- > end) {
		nonce[i] += 1;
		if (nonce[i] !== 0) {
			break;
		}
	}
	if (i < end) {
		await generateNonce(nonce);
	}
	return nonce;
};
