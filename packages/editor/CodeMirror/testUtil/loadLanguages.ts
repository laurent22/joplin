import allLanguages from '../markdown/codeBlockLanguages/allLanguages';

// Ensure languages we use are loaded. Without this, tests may randomly fail (LanguageDescriptions
// are loaded asynchronously, in the background).
const loadLanguages = async () => {
	for (const lang of allLanguages) {
		await lang.load();
	}
};
export default loadLanguages;
