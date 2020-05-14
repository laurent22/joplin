/* eslint-disable no-unused-vars */
/* eslint-disable no-cond-assign */

// match[1] AND/OR tagName:tagValue
// match[2] AND/OR
// match[3] -
// match[4] tagName
// match[6] tagValue
// const filterRegex = /(\b(AND|OR)\s+)?(-?)([\w]+|"[^"]+")\s*(:\s*([^\s:*"]+|"[^"]+"))?/giu;
const filterRegex = /(\b(AND|OR)\s+)?(-?)(([\w]+|"[^"]+")\s*(:\s*([^\s:*"]+|"[^"]+"))|(\b[^:\s"]+\b|"[^"]+"))/giu;
// Relevant groups
// 2 - relation
// 3 - negation?
// 5 - filterName?
// 7 - filterValue
// 8 - quoted/unquoted Text


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
		let filterName = match[5];
		const text = match[8];
		const relation = match[2] ? match[2].toUpperCase() : 'AND';
		const filterValue = match[7];

		if (filterName && !filterValue) continue;

		let terms;
		if (filterName) {
			terms = trimQuotes(filterValue).split(' ').map(value => ({ relation: relation, value: value }));
		} else {
			// Quotes are not trimmed to allow phrase search
			filterName = 'text';
			terms = [{ relation: relation, value: text }];
		}

		if (filters.has(filterName)) {
			filters.set(filterName, [...filters.get(filterName), ...terms]);
		} else {
			filters.set(filterName, terms);
		}
	}

	return filters;
};
