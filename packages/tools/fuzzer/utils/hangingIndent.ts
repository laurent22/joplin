
// Hanging indent: Indents all lines after the first
const hangingIndent = (text: string, indentation = '   ') => {
	return text.replace(/\n/g, `\n${indentation}`);
};

export default hangingIndent;
