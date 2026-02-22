import { toIso639Alpha3 } from '../../../locale';

// Some Tesseract language codes differ from ISO 639-3. This table maps
// full locale strings to the correct Tesseract identifiers for cases where
// the ISO 639-3 code alone is ambiguous (e.g. Chinese variants) or simply
// wrong (e.g. Norwegian Bokmål).
const localeToTesseractOverride_: Record<string, string> = {
	'zh_CN': 'chi_sim', // Simplified Chinese – mainland China
	'zh_SG': 'chi_sim', // Simplified Chinese – Singapore
	'zh_TW': 'chi_tra', // Traditional Chinese – Taiwan
	'zh_HK': 'chi_tra', // Traditional Chinese – Hong Kong
	'zh': 'chi_sim', // generic Chinese – default to Simplified
};

// Maps ISO 639-3 codes to Tesseract equivalents where they differ.
const alpha3ToTesseract_: Record<string, string> = {
	'nob': 'nor', // Norwegian Bokmål
	'nno': 'nor', // Norwegian (nn)
};

const localeToTesseractLang = (locale: string): string => {
	if (localeToTesseractOverride_[locale]) return localeToTesseractOverride_[locale];
	const alpha3 = toIso639Alpha3(locale);
	return alpha3ToTesseract_[alpha3] ?? alpha3;
};

export default localeToTesseractLang;
