import { v4 as uuidv4 } from 'uuid';
import { customAlphabet } from 'nanoid/non-secure';
import { nanoid as nanoidSecure, customAlphabet as customAlphabetSecure } from 'nanoid';

// https://zelark.github.io/nano-id-cc/
// https://security.stackexchange.com/a/41749/1873
// > On the other hand, 128 bits (between 21 and 22 characters
// > alphanumeric) is beyond the reach of brute-force attacks pretty much
// > indefinitely
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 22);


export default {
	create: function(): string {
		return uuidv4().replace(/-/g, '');
	},
	createNano: function(): string {
		return nanoid();
	},
};

export const createSecureRandom = (size = 32) => {
	return nanoidSecure(size);
};

type FuncUiidGen = (length?: number)=> string;

const cachedUuidgen: Record<number, FuncUiidGen> = {};
const createUuidgenCustomAlphabet = (length: number) => customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', length);

const getCachedUuidgen = (length: number) => {
	if (cachedUuidgen[length]) return cachedUuidgen[length];

	cachedUuidgen[length] = createUuidgenCustomAlphabet(length);
	return cachedUuidgen[length];
};

export const uuidgen = (length = 22) => {
	const cachedUuidgen = getCachedUuidgen(length);
	return cachedUuidgen();
};

export const createNanoForInboxEmail = (): string => {
	return customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8)();
};

export { customAlphabetSecure };
