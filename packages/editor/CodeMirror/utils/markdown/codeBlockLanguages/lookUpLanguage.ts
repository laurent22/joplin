
// Intended for use by the `markdown({ ... })` extension.
import { LanguageDescription } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import defaultLanguage from './defaultLanguage';
const lookUpLanguage = (languageInfo: string) => {
	return LanguageDescription.matchLanguageName(languages, languageInfo) ?? defaultLanguage;
};

export default lookUpLanguage;
