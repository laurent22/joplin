// Use the CommonJS entry directly. Webpack resolves the package entry to an ES module,
// which is incompatible with TypeScript's CommonJS default import wrapper.
const emojiRegex: typeof import('emoji-regex').default = require('emoji-regex/index.js');

const lastEmoji = (input: string, previousEmoji = ''): string => {
	const insertedEmoji = previousEmoji ? input.replace(previousEmoji, '').trim().match(emojiRegex())?.pop() : undefined;
	return insertedEmoji ?? input.trim().match(emojiRegex())?.pop() ?? '';
};

export default lastEmoji;
