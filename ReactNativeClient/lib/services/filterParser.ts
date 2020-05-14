/* eslint-disable no-unused-vars */
/* eslint-disable no-cond-assign */

// match[1] AND/OR tagName:tagValue
// match[2] AND/OR
// match[3] -
// match[4] tagName
// match[6] tagValue
const filterRegex = /(\b(AND|OR)\s+)?(-?)([\w]+|"[^"]+")\s*(:\s*([^\s:*"]+|"[^"]+"))?/giu;

interface Term {
  relation: string;
  value: string;
}

const trimQuotes = (str: string) => str.startsWith('"') ? str.substr(1, str.length - 2) : str;

module.exports = (searchString: string): any => {
	searchString = searchString.trim();

	const filters: Map<string, Array<Term>> = new Map();

	let match;
	while ((match = filterRegex.exec(searchString))) {
		const name = match[4];
		const relation = match[2] ? match[2].toUpperCase() : 'AND';
		const value = match[6];

		if (!value) continue;

		// support phrase search for text query by not trimming quotes
		let term;
		if (name === 'text') {
			term = [{ relation: relation, value: value }];
		} else {
			term = trimQuotes(value).split(' ').map(v => ({ relation: relation, value: v }));
		}
		if (filters.has(name)) {
			filters.set(name, [...filters.get(name), ...term]);
		} else {
			filters.set(name, term);
		}
	}

	return filters;
};
