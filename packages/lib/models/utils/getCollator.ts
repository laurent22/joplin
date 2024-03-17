import { currentLocale, languageCodeOnly } from '../../locale';

function getCollator(locale: string = getCollatorLocale()) {
	return new Intl.Collator(locale, { numeric: true, sensitivity: 'accent' });
}

function getCollatorLocale() {
	const collatorLocale = languageCodeOnly(currentLocale());
	return collatorLocale;
}

export { getCollator, getCollatorLocale };
