interface Filter {
	relation: string,
	name: string,
	value: string
}

interface Term {
  name: string;
  value: string;
}

const getTerms = (query: string) : Term[] => {
	const terms: Term[] = [];
	let inQuote = false;
	let currentCol = '_';
	let currentTerm = '';
	for (let i = 0; i < query.length; i++) {
		const c = query[i];

		if (c === '"') {
			currentTerm += c; // keep the quotes
			if (inQuote) {
				terms.push({ name: currentCol, value: currentTerm });
				currentTerm = '';
				inQuote = false;
			} else {
				inQuote = true;
			}
			continue;
		}

		if (c === ' ' && !inQuote) {
			if (!currentTerm) continue;
			terms.push({ name: currentCol, value: currentTerm });
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
	if (currentTerm) terms.push({ name: currentCol, value: currentTerm });
	return terms;
};

const parseQuery = (query: string): Array<Filter> => {
	// tag:123 tag:234 or some query -> [["tag", "123"], ["tag", "234"], ["_", "or"], ["_", "some"], ["_", "query"]]
	const validFilters = new Set(['title', 'body', 'tag', 'notebook', 'created', 'updated', 'todo']);

	const terms = getTerms(query);

	const defaultRelation = 'AND';
	let relation = defaultRelation;
	const result: Filter[] = [];
	for (let i = 0; i < terms.length; i++) {
		let name = terms[i].name;
		const value = terms[i].value;

		if (name !== '_') {
			if (name.startsWith('-')) {
				relation = 'NOT';
				name = name.slice(1);
			}

			if (!validFilters.has(name)) {
				throw new Error(`Invalid filter: ${name}`);
			}

			if (name === 'title' || name === 'body') {
				// Trim quotes since we don't support phrase query here
				// eg. Split title:"hello world" to title:hello title:world with relation
				const values = trimQuotes(value).split(' ');
				values.forEach(value => {
					result.push({ relation, name, value });
				});
			} else {
				result.push({ relation, name, value });
			}
			relation = defaultRelation; // reset to default
		} else {
			// could be AND or OR or text to fts search
			if (value.toUpperCase() !== 'AND' && value.toUpperCase() !== 'OR') {
				// this is text
				result.push({ relation: relation, name: 'text', value: value });
				relation = defaultRelation; // reset to default
			} else {
				// this is a relation for the next term;
				relation = value.toUpperCase();
			}
		}
	}
	return result;
};

const trimQuotes = (str: string): string => str.startsWith('"') ? str.substr(1, str.length - 2) : str;

export default function filterParser(searchString: string) {
	searchString = searchString.trim();
	const filters: Map<string, {relation:string, value: string}[]> = new Map();

	const matches = parseQuery(searchString);
	for (const match of matches) {
		const { name, relation, value } = match;

		if (!value) continue;

		if (filters.has(name)) {
			filters.set(name, [...filters.get(name), { relation, value }]);
		} else {
			filters.set(name, [{ relation, value }]);
		}
	}

	return filters;
}
