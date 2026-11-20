// Makes the CSS of a clipped page or an email fit in a note: comments are removed, and every run of whitespace outside
// strings becomes a single space, so that no line is indented, which could make it render as a code block. Each
// closing brace ends a line, so that lines stay short enough for editors. Nothing else is changed, so unlike a
// minifier, it keeps any CSS it does not know about, such as newer at-rules or nesting, and it takes linear time.
const compactCss = (css: string) => {
	const output: string[] = [];
	let lastChar = '';
	let pendingSpace = false;
	let i = 0;

	const append = (text: string) => {
		if (pendingSpace && lastChar && !'\n{};'.includes(lastChar)) output.push(' ');
		pendingSpace = false;
		output.push(text);
		lastChar = text[text.length - 1];
	};

	while (i < css.length) {
		const c = css[i];

		if (c === '/' && css[i + 1] === '*') {
			const end = css.indexOf('*/', i + 2);
			i = end === -1 ? css.length : end + 2;
			pendingSpace = true;
		} else if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f') {
			pendingSpace = true;
			i++;
		} else if (c === '"' || c === '\'') {
			// A string ends at its closing quote, or at an unescaped line break, as in a browser
			let end = i + 1;
			while (end < css.length && css[end] !== c && css[end] !== '\n') {
				end += css[end] === '\\' ? 2 : 1;
			}
			append(css.substring(i, Math.min(end + 1, css.length)));
			i = end + 1;
		} else if (c === '{' || c === '}' || c === ';') {
			// Except in an empty custom property, which older browsers only accept with a space
			if (lastChar !== ':') pendingSpace = false;
			append(c === '}' ? '}\n' : c);
			i++;
		} else {
			append(c);
			i++;
		}
	}

	return output.join('').trim();
};

export default compactCss;
