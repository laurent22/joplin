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

	// tag:123 tag:234 or some query -> [["tag", "123"], ["tag", "234"], ["_", "or"], ["_", "some"], ["_", "query"]]
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


	let relation = 'AND'; // default relation
	const result: Array<Filter> = [];
	for (let i = 0; i < terms.length; i++) {
		if (terms[i][0] !== '_') {
			// Hopefully a valid filter
			// TO DO : handle negation
			const name = terms[i][0];
			const value = terms[i][1];

			if (name.startsWith('-')) {
				result.push({ relation: 'NOT', name: name.slice(1), value: value });
			} else {
				result.push({ relation, name, value });
			}
			relation = 'AND'; // reset to default
		} else {
			// could be AND or OR or text to fts search
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
