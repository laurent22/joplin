
import { Buffer } from 'buffer';

// Fix the subarray method.
// TODO: Remove this after https://github.com/feross/buffer/issues/329 is closed
const originalSubarray = Buffer.prototype.subarray;
Buffer.prototype.subarray = function(start: number, end: number) {
	const subarray = originalSubarray.call(this, start, end);
	Object.setPrototypeOf(subarray, Buffer.prototype);
	return subarray;
};

// TODO: Remove this "disable-next-line" after eslint supports globalThis.
// eslint-disable-next-line no-undef
globalThis.Buffer = Buffer;
