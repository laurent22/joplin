import { currentLocale, languageCodeOnly } from '../../locale';

function getCollator(locale: string) {
	return new Intl.Collator(locale, { numeric: true, sensitivity: 'accent' });
}

function getCollatorLocale() {
	const collatorLocale_ = languageCodeOnly(currentLocale());
	return collatorLocale_;
}

export { getCollator, getCollatorLocale };
