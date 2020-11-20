function pregQuote(str, delimiter = '') {
	return (`${str}`).replace(new RegExp(`[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\${delimiter || ''}-]`, 'g'), '\\$&');
}

function replaceRegexDiacritics(regexString) {
	if (!regexString) return '';

	const diacriticReplacements = {
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

if (typeof module !== 'undefined') {
	module.exports = { pregQuote, replaceRegexDiacritics };
}
