
interface Term {
	name: string;
	value: string;
	negated: boolean;
	quoted?: boolean;
	wildcard?: boolean;
}

const makeTerm = (name: string, value: string): Term => {
	if (name.startsWith('-')) { return { name: name.slice(1).toLowerCase(), value: value, negated: true }; }
	return { name: name.toLowerCase(), value: value, negated: false };
};

const quoted = (s: string) => s.startsWith('"') && s.endsWith('"');

const quote = (s: string) => {
	if (!quoted(s)) {
		return `"${s}"`;
	}
	return s;
};


const getTerms = (query: string, validFilters: Set<string>): Term[] => {
	const terms: Term[] = [];
	let inQuote = false;
	let inTerm = false;
	let currentCol = '_';
	let currentTerm = '';
	for (let i = 0; i < query.length; i++) {
		const c = query[i];

		if (c === '"') {
			currentTerm += c; // keep the quotes
			if (inQuote) {
				terms.push(makeTerm(currentCol, currentTerm));
				currentTerm = '';
				currentCol = '_';
				inQuote = false;
			} else {
				inQuote = true;
			}
			continue;
		}

		if (c === ' ' && !inQuote) {
			inTerm = false;
			if (!currentTerm) continue;
			terms.push(makeTerm(currentCol, currentTerm));
			currentCol = '_';
			currentTerm = '';
			continue;
		}

		if (c === ':' && !inQuote && !inTerm &&
		(validFilters.has(currentTerm.toLowerCase()) || currentTerm[0] === '-' && validFilters.has(currentTerm.toLowerCase().substr(1, currentTerm.length)))) {
			currentCol = currentTerm.toLowerCase();
			currentTerm = '';
			inTerm = true; // to ignore any other ':' before a space eg.'sourceurl:https://www.google.com'
			continue;
		}

		currentTerm += c;
	}
	if (currentTerm) terms.push(makeTerm(currentCol, currentTerm));
	return terms;
};

const parseQuery = (query: string): Term[] => {
	const validFilters = new Set(['any', 'title', 'body', 'tag',
		'notebook', 'created', 'updated', 'type',
		'iscompleted', 'due', 'latitude', 'longitude',
		'altitude', 'resource', 'sourceurl', 'id']);

	const terms = getTerms(query, validFilters);

	const result: Term[] = [];
	for (let i = 0; i < terms.length; i++) {
		const { name, value, negated } = terms[i];

		if (name !== '_') {
			if (!validFilters.has(name)) {
				throw new Error(`Invalid filter: ${name}`);
			}

			if (name === 'tag' || name === 'notebook' || name === 'resource' || name === 'sourceurl') {
				result.push({ name, value: trimQuotes(value.replace(/[*]/g, '%')), negated }); // for wildcard search
			} else if (name === 'title' || name === 'body') {
				// Trim quotes since we don't support phrase query here
				// eg. Split title:"hello world" to title:hello title:world
				const values = trimQuotes(value).split(/[\s-_]+/);
				values.forEach(value => {
					result.push({ name, value, negated, wildcard: value.indexOf('*') >= 0 });
				});
			} else {
				result.push({ name, value, negated });
			}
		} else {
			// Every word is quoted if not already.
			// By quoting the word, FTS match query will take care of removing dashes and other word seperators.
			if (value.startsWith('-')) {
				result.push({
					name: 'text',
					value: quote(value.slice(1)),
					negated: true,
					quoted: quoted(value),
					wildcard: value.indexOf('*') >= 0,
				});
			} else {
				result.push({
					name: 'text',
					value: quote(value),
					negated: false,
					quoted: quoted(value),
					wildcard: value.indexOf('*') >= 0,
				});
			}
		}
	}

	// validation
	let incorrect = result.filter(term => term.name === 'type' || term.name === 'iscompleted')
		.find(x => x.negated);
	if (incorrect) throw new Error(`${incorrect.name} can't be negated`);

	incorrect = result.filter(term => term.name === 'type')
		.find(x => (x.value !== 'note' && x.value !== 'todo'));
	if (incorrect) throw new Error('The value of filter "type" must be "note" or "todo"');

	incorrect = result.filter(term => term.name === 'iscompleted')
		.find(x => (x.value !== '1' && x.value !== '0'));
	if (incorrect) throw new Error('The value of filter "iscompleted" must be "1" or "0"');


	return result;
};

const trimQuotes = (str: string): string => str.startsWith('"') ? str.substr(1, str.length - 2) : str;

export default function filterParser(searchString: string) {
	searchString = searchString.trim();

	const result = parseQuery(searchString);

	return result;
}
