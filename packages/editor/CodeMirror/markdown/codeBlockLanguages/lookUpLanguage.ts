//
// Exports a list of languages that can be used in fenced code blocks.
//

import { LanguageDescription } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import defaultLanguage from './defaultLanguage';


const lookUpLanguage = (languageInfo: string) => {
	return LanguageDescription.matchLanguageName(languages, languageInfo) ?? defaultLanguage;
};

export default lookUpLanguage;
