import { toIso639Alpha3 } from '../../../locale';

const ocrLanguageOverrides: Record<string, string> = {
	nob: 'nor',
	nno: 'nor',
};

const ocrLanguageFromLocale = (locale: string): string => {
	const alpha3Code = toIso639Alpha3(locale);
	return ocrLanguageOverrides[alpha3Code] || alpha3Code;
};

export default ocrLanguageFromLocale;
