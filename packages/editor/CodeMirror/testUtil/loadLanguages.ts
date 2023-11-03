import syntaxHighlightingLanguages from '../markdown/syntaxHighlightingLanguages';

// Ensure languages we use are loaded. Without this, tests may randomly fail (LanguageDescriptions
// are loaded asyncronously, in the background).
const loadLangauges = async () => {
	const allLanguages = syntaxHighlightingLanguages;

	for (const lang of allLanguages) {
		await lang.load();
	}
};
export default loadLangauges;
