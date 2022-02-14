import shortUuid = require('short-uuid');
const generate = require('nanoid/generate');

const charSet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

let shortUuidTranslator_: shortUuid.Translator = null;

const shortUuidTranslator = () => {
	if (!shortUuidTranslator_) shortUuidTranslator_ = shortUuid(charSet);
	return shortUuidTranslator_;
};

// https://zelark.github.io/nano-id-cc/
// https://security.stackexchange.com/a/41749/1873
// > On the other hand, 128 bits (between 21 and 22 characters
// > alphanumeric) is beyond the reach of brute-force attacks pretty much
// > indefinitely
export const uuidgen = (length: number = 22): string => {
	return generate(charSet, length);
};

const isReservedId = (s: string): boolean => {
	return ['me', 'new'].includes(s);
};

export const shortToLong = (shortId: string): string => {
	if (isReservedId(shortId)) return shortId;
	return shortUuidTranslator().toUUID(shortId);
};

export const longToShort = (longId: string): string => {
	if (isReservedId(longId)) return longId;
	return shortUuidTranslator().fromUUID(longId);
};
