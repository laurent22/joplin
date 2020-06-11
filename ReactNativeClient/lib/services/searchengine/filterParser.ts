
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

const parseQuery = (query: string): Array<Term> => {
	const validFilters = new Set(['title', '-title', 'body', '-body', 'tag', '-tag', 'notebook', '-notebook', 'created', '-created',  'updated', 'type', 'iscompleted']);

	const terms = getTerms(query);

	const result: Term[] = [];
	for (let i = 0; i < terms.length; i++) {
		const name = terms[i].name;
		const value = terms[i].value;

		if (name !== '_') {
			if (!validFilters.has(name)) {
				throw new Error(`Invalid filter: ${name}`);
			}

			if (name === 'title' || name === 'body') {
				// Trim quotes since we don't support phrase query here
				// eg. Split title:"hello world" to title:hello title:world
				const values = trimQuotes(value).split(' ');
				values.forEach(value => {
					result.push({ name, value });
				});
			} else {
				result.push({ name, value });
			}
		} else {
			// text to fts search
			if (value.startsWith('-')) {
				result.push({ name: '-text', value: value.slice(1) });
			} else {
				result.push({ name: 'text', value: value });
			}
		}
	}
	return result;
};

const trimQuotes = (str: string): string => str.startsWith('"') ? str.substr(1, str.length - 2) : str;

export default function filterParser(searchString: string) {
	searchString = searchString.trim();
	const filters: Map<string, string[]> = new Map();

	const matches = parseQuery(searchString);
	for (const match of matches) {
		const { name, value } = match;

		if (!value) continue;

		if (filters.has(name)) {
			filters.set(name, [...filters.get(name), value]);
		} else {
			filters.set(name, [value]);
		}
	}

	return filters;
}
