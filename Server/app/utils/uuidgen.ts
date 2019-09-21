const generate = require('nanoid/generate');

export default function uuidgen():string {
	return generate('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 22);
}
