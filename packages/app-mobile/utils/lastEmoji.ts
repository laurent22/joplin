// Use the CommonJS entry directly. Webpack resolves the package entry to an ES module,
// which is incompatible with TypeScript's CommonJS default import wrapper.
const emojiRegex: typeof import('emoji-regex').default = require('emoji-regex/index.js');

const lastEmoji = (input: string, previousEmoji = ''): string => {
	const matches: string[] = input.trim().match(emojiRegex()) ?? [];
	const fallback = matches[matches.length - 1] ?? '';
	const previousIndex = matches.indexOf(previousEmoji);
	if (previousIndex >= 0) matches.splice(previousIndex, 1);
	return matches[matches.length - 1] ?? fallback;
};

export default lastEmoji;
