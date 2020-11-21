const generate = require('nanoid/generate');

export default function uuidgen(length: number = 22): string {
	return generate('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', length);
}
