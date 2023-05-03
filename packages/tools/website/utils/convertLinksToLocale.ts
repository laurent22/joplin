import { Locale } from './types';

export default (md: string, locale: Locale) => {
	if (locale.lang === 'en-gb') return md;

	md = md.replace(/\(\//g, `(/${locale.pathPrefix}/`);

	return md;
};
