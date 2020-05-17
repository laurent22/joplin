
interface Filter {
	relation: string,
	name: string,
	value: string
}

interface Term {
  relation: string;
  value: string;
}

const parseQuery = (query: string): Array<Filter> => {
	const terms = [];

	let inQuote = false;
	let currentCol = '_';
	let currentTerm = '';
	for (let i = 0; i < query.length; i++) {
		const c = query[i];

		if (c === '"') {
			currentTerm += c; // keep the quotes
			if (inQuote) {
				terms.push([currentCol, currentTerm]);
				currentTerm = '';
				inQuote = false;
			} else {
				inQuote = true;
			}
			continue;
		}

		if (c === ' ' && !inQuote) {
			if (!currentTerm) continue;
			terms.push([currentCol, currentTerm]);
			currentCol = '_';
			currentTerm = '';
			continue;
		}

		if (c === ':' && !inQuote) {
			currentCol = currentTerm;
			currentTerm = '';
			continue;
		}

		currentTerm += c;
	}
	if (currentTerm) terms.push([currentCol, currentTerm]);

	// [["tag", "123"], ["tag", "234"], ["_", "some"], ["_", "text"]]  tag:123 tag:234 some text
	// terms is like an array

	let relation = 'AND'; // default relation
	const result: Array<Filter> = [];
	for (let i = 0; i < terms.length; i++) {
		if (terms[i][0] !== '_') {
			// Hopefully a valid filter
			// TO DO : handle negation
			result.push({ relation: relation, name: terms[i][0], value: terms[i][1] });
			relation = 'AND'; // reset to default
		} else {
			// could be AND OR, else text to fts search
			if (terms[i][1].toUpperCase() !== 'AND' && terms[i][1].toUpperCase() !== 'OR') {
				// this is text
				result.push({ relation: relation, name: 'text', value: terms[i][1] });
				relation = 'AND'; // reset to default
			} else {
				// this is a relation for the next term;
				relation = terms[i][1].toUpperCase(); // OR
			}
		}
	}

	return result;
};


const trimQuotes = (str: string): string => str.startsWith('"') ? str.substr(1, str.length - 2) : str;

// const filterParser = (searchString: string): Map<string, Array<Term>> => {
// 	searchString = searchString.trim();
// 	const filters: Map<string, Array<Term>> = new Map();

// 	const matches = parseQuery(searchString);
// 	let terms: Array<Term>;
// 	for (const match of matches) {
// 		const { name, relation, value } = match;
// 		if (!value) continue;

// 		if (name === 'title' || name === 'body') {
// 			// Trim quotes since we don't support phrase query here
// 			// eg. Split title:"hello world" to title:hello title:world with relation
// 			terms = trimQuotes(match.value).split(' ').map(value => ({ relation, value }));
// 		} else {
// 			terms = [{ relation, value }];
// 		}
// 		filters.set(name, filters.get(name) ? [...filters.get(name), ...terms] : terms);
// 	}

// 	return filters;
// };

export function filterParser(searchString: string) {
	searchString = searchString.trim();
	const filters: Map<string, Array<Term>> = new Map();

	const matches = parseQuery(searchString);
	let terms: Array<Term>;
	for (const match of matches) {
		const { name, relation, value } = match;

		if (!value) continue;

		if (name === 'title' || name === 'body') {
			// Trim quotes since we don't support phrase query here
			// eg. Split title:"hello world" to title:hello title:world with relation
			terms = trimQuotes(match.value).split(' ').map(value => ({ relation, value }));
		} else {
			terms = [{ relation, value }];
		}
		filters.set(name, filters.get(name) ? [...filters.get(name), ...terms] : terms);
	}

	return filters;
}
