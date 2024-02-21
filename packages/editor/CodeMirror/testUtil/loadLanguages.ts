import allLanguages from '../markdown/codeBlockLanguages/allLanguages';

// Ensure languages we use are loaded. Without this, tests may randomly fail (LanguageDescriptions
// are loaded asyncronously, in the background).
const loadLangauges = async () => {
	for (const lang of allLanguages) {
		await lang.load();
	}
};
export default loadLangauges;
