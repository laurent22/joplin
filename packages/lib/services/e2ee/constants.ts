import { Digest } from './types';

export const digestNameMap: Record<Digest, string> = {
	sha1: 'SHA-1',
	sha224: 'SHA-224',
	sha256: 'SHA-256',
	sha384: 'SHA-384',
	sha512: 'SHA-512',
	ripemd160: 'RIPEMD-160',
};

export default digestNameMap;
