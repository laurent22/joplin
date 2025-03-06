// Some sources present licenses with different spacing.
// This function can be used to compare ignoring spaces.
const wordsMatch = (text1: string, text2: string) => {
	const excludeRegex = /[ \t\n"]+/g;
	text1 = text1.replace(excludeRegex, ' ').trim().toLowerCase();
	text2 = text2.replace(excludeRegex, ' ').trim().toLowerCase();

	return text1 === text2;
};

export default wordsMatch;
