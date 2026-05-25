
// Ensure languages we use are loaded. Without this, tests may randomly fail (LanguageDescriptions
// are loaded asynchronously, in the background).
import allLanguages from '../utils/markdown/codeBlockLanguages/allLanguages';
const loadLanguages = async () => {
	for (const lang of allLanguages) {
		await lang.load();
	}
};
export default loadLanguages;
