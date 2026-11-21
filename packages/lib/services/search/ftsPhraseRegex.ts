// Matches the separators of the FTS "simple" tokenizer: ASCII non-alphanumeric characters. Non-ASCII
// characters are part of words, so `\W` would wrongly skip over non-Latin words.
const separatorRegex = '[\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\x7f]+';

export default (termRegexes: string[]) => {
	if (termRegexes.length < 2) return null;
	return new RegExp(termRegexes.join(separatorRegex), 'i');
};
