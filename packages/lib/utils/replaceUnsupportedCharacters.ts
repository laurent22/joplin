
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
	// eslint-disable-next-line no-control-regex
	return text.replace(/\x00/g, '\uFFFD');
};

export default replaceUnsupportedCharacters;
