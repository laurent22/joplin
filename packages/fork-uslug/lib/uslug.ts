// Based on @joplin/fork-uslug
//
// The original is Copyright (c) 2012 Jeremy Selier
//
// MIT Licensed
//
// You may find a copy of this license in the LICENSE file that should have been provided
// to you with a copy of this software.

const nodeEmoji = require('node-emoji');

// Very old browsers (e.g. Chrome < 64, which is from 2018) may not support
// \p{} regexes.
let regexes_;
try {
	regexes_ = {
		// eslint-disable-next-line prefer-regex-literals -- Needed to prevent syntax errors
		L: new RegExp('\\p{L}', 'u'), N: new RegExp('\\p{N}', 'u'), Z: new RegExp('\\p{Z}', 'u'), M: new RegExp('\\p{M}', 'u'),
	};
} catch (error) {
	console.error(error);
	regexes_ = undefined;
}

const _unicodeCategory = function(c: string) {
	if (!regexes_) {
		console.warn('Unicode RegExps not loaded. Skipping category check.');
		return undefined;
	}

	for (const [key, val] of Object.entries(regexes_)) {
		if (c.match(val)) return key;
	}
	return undefined;
};

interface Options {
	lower?: boolean;
	spaces?: boolean;
	allowedChars?: string;
}

export default function(string: string, options: Options = {}) {
	string = string || '';

	options = options || {};

	const allowedChars = options.allowedChars || '-_~';
	const lower = typeof options.lower === 'boolean' ? options.lower : true;
	const spaces = typeof options.spaces === 'boolean' ? options.spaces : false;

	const rv = [];

	const noEmojiString: string = nodeEmoji.unemojify(string);
	const chars = noEmojiString.normalize('NFKC').split('');

	for (let i = 0; i < chars.length; i++) {
		const c = chars[i];
		const code = c.charCodeAt(0);

		// Allow Common CJK Unified Ideographs
		// See: http://www.unicode.org/versions/Unicode6.0.0/ch12.pdf - Table 12-2

		if (0x4E00 <= code && code <= 0x9FFF) {
			rv.push(c);
			continue;
		}

		// Allow Hangul
		if (0xAC00 <= code && code <= 0xD7A3) {
			rv.push(c);
			continue;
		}

		// Japanese ideographic punctuation
		if ((0x3000 <= code && code <= 0x3002) || (0xFF01 <= code && code <= 0xFF02)) {
			rv.push(' ');
		}

		if (allowedChars.indexOf(c) !== -1) {
			rv.push(c);
			continue;
		}

		const val = _unicodeCategory(c);
		if (val && ~'LNM'.indexOf(val)) rv.push(c);
		if (val && ~'Z'.indexOf(val)) rv.push(' ');
	}
	let slug = rv.join('').replace(/^\s+|\s+$/g, '').replace(/\s+/g, ' ');

	if (!spaces) slug = slug.replace(/[\s-]+/g, '-');
	if (lower) slug = slug.toLowerCase();

	return slug;
}
