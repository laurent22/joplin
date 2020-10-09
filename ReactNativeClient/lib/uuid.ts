const createUuidV4 = require('uuid/v4');
const { customAlphabet } = require('nanoid/non-secure');

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 22);

export default {
	create: function() {
		return createUuidV4().replace(/-/g, '');
	},
	createNano: function() {
		return nanoid();
	},
};
