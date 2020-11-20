const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = new Entities().encode;

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

// keywords can either be a list of strings, or a list of objects with the format:
// { value: 'actualkeyword', type: 'regex/string' }
// The function surrounds the keywords wherever they are, even within other words.
function surroundKeywords(keywords, text, prefix, suffix, options = null) {
	options = Object.assign({}, {
		escapeHtml: false,
	}, options);

	if (!keywords.length) return text;

	function escapeHtml(s) {
		if (!options.escapeHtml) return s;
		return htmlentities(s);
	}

	let regexString = keywords
		.map(k => {
			if (k.type === 'regex') {
				return escapeHtml(replaceRegexDiacritics(k.valueRegex));
			} else {
				const value = typeof k === 'string' ? k : k.value;
				return escapeHtml(replaceRegexDiacritics(pregQuote(value)));
			}
		})
		.join('|');
	regexString = `(${regexString})`;
	const re = new RegExp(regexString, 'gi');
	return text.replace(re, `${prefix}$1${suffix}`);
}

module.exports = { surroundKeywords };
