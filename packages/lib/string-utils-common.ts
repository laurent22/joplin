/**
 * Escapes the given string for use in a regular expression.
 * @param str String to be escaped
 * @param delimiter An additional separator character that will also be escaped, if provided.
 * @returns a version of [str] with all regex control characters escaped.
 */
export function pregQuote(str: string, delimiter: string = '') {
	return (`${str}`).replace(new RegExp(`[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\${delimiter || ''}-]`, 'g'), '\\$&');
}

/**
 * Causes letters in the given string to match versions with different diacritics.
 * For example, this makes 'a' match 'à', 'ä', 'ā'...
 *
 * @param regexString A regular expression with no character match groups (without [a-zA-Z]-style matchers).
 * @returns an updated regular expression string.
 */
export function replaceRegexDiacritics(regexString: string) {
	if (!regexString) return '';

	const diacriticReplacements: Record<string, string> = {
		a: '[aàáâãäåāą]',
		A: '[AÀÁÂÃÄÅĀĄ]',
		c: '[cçćč]',
		C: '[CÇĆČ]',
		d: '[dđď]',
		D: '[DĐĎ]',
		e: '[eèéêëěēę]',
		E: '[EÈÉÊËĚĒĘ]',
		i: '[iìíîïī]',
		I: '[IÌÍÎÏĪ]',
		l: '[lł]',
		L: '[LŁ]',
		n: '[nñňń]',
		N: '[NÑŇŃ]',
		o: '[oòóôõöøō]',
		O: '[OÒÓÔÕÖØŌ]',
		r: '[rř]',
		R: '[RŘ]',
		s: '[sšś]',
		S: '[SŠŚ]',
		t: '[tť]',
		T: '[TŤ]',
		u: '[uùúûüůū]',
		U: '[UÙÚÛÜŮŪ]',
		y: '[yÿý]',
		Y: '[YŸÝ]',
		z: '[zžżź]',
		Z: '[ZŽŻŹ]',
	};

	let output = '';
	for (let i = 0; i < regexString.length; i++) {
		const c = regexString[i];
		const r = diacriticReplacements[c];
		if (r) {
			output += r;
		} else {
			output += c;
		}
	}

	return output;
}

