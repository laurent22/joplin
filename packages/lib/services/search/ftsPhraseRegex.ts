import { escapeRegExp } from '../../string-utils';

// Mirrors the FTS "simple" tokenizer: ASCII alphanumerics and all non-ASCII characters are part of
// words, everything else is a separator. Keeping the two classes disjoint also keeps backtracking
// linear on long runs of punctuation.
const wordChar = '[a-z0-9\\u0080-\\uffff]';
const separator = '[\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\x7f]+';

// Terms as typed in the query, optionally ending with "*" for a prefix match
export default (terms: string[]) => {
	if (terms.length < 2) return null;

	const termRegexes = terms.map(term => {
		const isPrefix = term.endsWith('*');
		const literal = escapeRegExp(isPrefix ? term.slice(0, -1) : term);
		return isPrefix ? `${literal}${wordChar}*` : literal;
	});

	return new RegExp(`(?<!${wordChar})${termRegexes.join(separator)}(?!${wordChar})`, 'i');
};
