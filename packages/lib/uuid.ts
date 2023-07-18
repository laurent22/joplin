import { v4 as uuidv4 } from 'uuid';
import { customAlphabet } from 'nanoid/non-secure';

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
	createNanoForInboxEmail: (): string => {
		return customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8)();
	},
};
