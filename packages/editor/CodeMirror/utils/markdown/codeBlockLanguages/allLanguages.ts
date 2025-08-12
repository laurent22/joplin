import { LanguageDescription } from '@codemirror/language';
import { languages } from '@codemirror/language-data';

const additionalAliases: Record<string, string[]> = {
	'python': ['py'],
	'rust': ['rs'],
	'markdown': ['md'],
};

// Convert supportedLanguages to a CodeMirror-readable list
// of LanguageDescriptions
export const allLanguages: LanguageDescription[] = [];

for (const language of languages) {
	const languageId = language.name.toLowerCase();

	if (additionalAliases.hasOwnProperty(languageId)) {
		allLanguages.push(LanguageDescription.of({
			name: language.name,
			alias: [...language.alias, ...additionalAliases[languageId]],
			extensions: language.extensions,
			filename: language.filename,
			support: language.support,
			load: () => language.load.call(language),
		}));
	} else {
		allLanguages.push(language);
	}
}

export default allLanguages;
