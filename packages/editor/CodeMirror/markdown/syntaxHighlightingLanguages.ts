//
// Exports a list of languages that can be used in fenced code blocks.
//

import { LanguageDescription } from '@codemirror/language';
import { languages } from '@codemirror/language-data';

const additionalAliases: Record<string, string[]> = {
	'python': ['py'],
	'rust': ['rs'],
	'markdown': ['md'],
};

// Convert supportedLanguages to a CodeMirror-readable list
// of LanguageDescriptions
const syntaxHighlightingLanguages: LanguageDescription[] = [];

for (const language of languages) {
	const languageId = language.name.toLowerCase();

	if (additionalAliases.hasOwnProperty(languageId)) {
		syntaxHighlightingLanguages.push(LanguageDescription.of({
			name: language.name,
			alias: [...language.alias, ...additionalAliases[languageId]],
			extensions: language.extensions,
			filename: language.filename,
			support: language.support,
			load: () => language.load.call(language),
		}));
	} else {
		syntaxHighlightingLanguages.push(language);
	}
}

export default syntaxHighlightingLanguages;
