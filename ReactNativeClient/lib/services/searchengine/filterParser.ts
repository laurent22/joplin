
interface Term {
	name: string
	value: string
	negated: boolean
}

const makeTerm = (name: string, value: string): Term => {
	if (name.startsWith('-')) { return { name: name.slice(1), value: value, negated: true }; }
	return { name: name, value: value, negated: false };
};

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
				terms.push(makeTerm(currentCol, currentTerm));
				currentTerm = '';
				inQuote = false;
			} else {
				inQuote = true;
			}
			continue;
		}

		if (c === ' ' && !inQuote) {
			if (!currentTerm) continue;
			terms.push(makeTerm(currentCol, currentTerm));
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
	if (currentTerm) terms.push(makeTerm(currentCol, currentTerm));
	return terms;
};

const parseQuery = (query: string): Term[] => {
	const validFilters = new Set(['any', 'title', '-title', 'body', '-body', 'tag',
		'-tag', 'notebook', 'created', '-created',  '-updated', 'updated', 'type',
		'iscompleted', 'latitude', '-latitude', 'longitude', '-longitude',
		'altitude', '-altitude', 'resource', '-resource']);

	const terms = getTerms(query);

	const result: Term[] = [];
	for (let i = 0; i < terms.length; i++) {
		const { name, value, negated } = terms[i];

		if (name !== '_') {
			if (!validFilters.has(name)) {
				throw new Error(`Invalid filter: ${name}`);
			}

			if (name === 'tag' || name === '-tag' || name === 'notebook' || name === 'resource' || name === '-resource') {
				const fuzzyValue = value.replace(/[*]/g, '%');
				result.push({ name, value: fuzzyValue, negated });
			} else if (name === 'title' || name === 'body') {
				// Trim quotes since we don't support phrase query here
				// eg. Split title:"hello world" to title:hello title:world
				const values = trimQuotes(value).split(' ');
				values.forEach(value => {
					result.push({ name, value, negated });
				});
			} else {
				result.push({ name, value, negated });
			}
		} else {
			// text to fts search, here value has the '-' if negated
			if (value.startsWith('-')) {
				result.push({ name: 'text', value: value.slice(1), negated: true });
			} else {
				result.push({ name: 'text', value: value, negated: false });
			}
		}
	}
	return result;
};

const trimQuotes = (str: string): string => str.startsWith('"') ? str.substr(1, str.length - 2) : str;

export default function filterParser(searchString: string) {
	searchString = searchString.trim();
	const result =  parseQuery(searchString);

	// validation
	let incorrect = result.filter(term => term.name === 'type')
		.find(x => (x.value !== 'note' && x.value !== 'todo') || (x.negated));
	if (incorrect) throw new Error('Invalid argument for filter type');


	incorrect = result.filter(term => term.name === 'iscompleted')
		.find(x => (x.value !== '1' && x.value !== '0') || (x.negated));
	if (incorrect) throw new Error('Invalid argument for filter iscompleted');


	return result;
}
