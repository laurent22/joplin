
const replaceUnsupportedCharacters = (text: string) => {
	// In the past, NULL characters have caused sync and search issues.
	// Because these issues are often difficult to debug, we remove these characters entirely.
	//
	// See
	// - Sync issue: https://github.com/laurent22/joplin/issues/5046
	// - Search issue: https://github.com/laurent22/joplin/issues/9775
	//
	// As per the commonmark spec, we replace \x00 with the replacement character.
	// (see https://spec.commonmark.org/0.31.2/#insecure-characters).
	//
	// Directional isolate characters (U+2066-2069) are invisible Unicode formatting
	// characters that can cause display issues in some contexts (e.g., appearing as
	// bullets in the markdown editor). We replace them with the replacement character.
	//
	// eslint-disable-next-line no-control-regex
	return text.replace(/\x00/g, '\uFFFD').replace(/[\u2066-\u2069]/g, '\uFFFD');
};

export default replaceUnsupportedCharacters;
