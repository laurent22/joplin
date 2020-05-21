const { time } = require('lib/time-utils.js');

interface Term {
  relation: string;
  value: string;
}

const tagFilter = (tags: Array<Term>) => {
	const noteIdsFromTag = 'SELECT note_tags.note_id FROM note_tags WHERE note_tags.tag_id IN (SELECT tags.id from tags WHERE tags.title LIKE ?)';
	let result = tags.map(tag => `${tag.relation === 'AND' ? 'INTERSECT' : tag.relation === 'NOT' ? 'EXCEPT' : 'UNION'} ${noteIdsFromTag}`).join(' ');
	result = `SELECT note_tags.note_id as id FROM note_tags WHERE 1 ${result}`;
	result = `tag_filter as (${result})`;
	return result;
};

const noteBookFilter = () => {
	// TO DO: Add multiple notebook support?
	return `child_notebooks(id) as (select folders.id from folders where id=(select id from folders where folders.title LIKE ?)
union all select folders.id from folders JOIN child_notebooks on folders.parent_id=child_notebooks.id)`;
};

// TODO: Add format check?
const hyphenateDate = (date: string) => `${date.slice(0,4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;

const getUnixMs = (date:string) => Date.parse(hyphenateDate(date));

const makeDateFilter = (type: string, filters: Map<string, Array<Term>>, queryParts: string[], params: string[]): void => {
	const smartValue = /(day|week|month|year)-([0-9]+)/i;
	const term = filters.get(type)[0];
	if (smartValue.test(term.value)) {
		const match = smartValue.exec(term.value);
		const timeDuration = match[1]; // eg. day, week, month, year
		const number = parseInt(match[2], 10); // eg. 1, 12, 101
		const timeFrom = time.goBackInTime(number, timeDuration); // eg. goBackInTime(1, 'day')
		queryParts.push(`AND ROWID IN (SELECT ROWID from notes where notes.user_${type}_time >= ?)`);
		params.push(timeFrom);
	} else {
		// string in YYYYMMDD format; TO DO: add validation test - throw error if invalid
		const msOfDay = getUnixMs(term.value); // unixMs from YYYYMMDD eg. 20150212
		const msOfNextDay = msOfDay + (60 * 60 * 24 * 1000);
		queryParts.push(`AND ROWID IN (SELECT ROWID from notes where notes.user_${type}_time >= ? AND notes.user_${type}_time < ?)`);
		params.push(msOfDay.toString(), msOfNextDay.toString());
	}
};

const makeMatchQuery = (name: string, filters:Map<string, Array<Term>>) => {
	if (name !== 'text') { return filters.get(name).map(term => `${term.relation === 'AND' ? '' : `${term.relation}`} ${name}:${term.value}`); } else { return filters.get(name).map(term => `${term.relation === 'AND' ? '' : `${term.relation}`} ${term.value}`); }
};

// The query we want to construct is this:
// with tag_filter as
// (
// select note_tags.note_id as id from note_tags
// where 1
// (intersect/union/except)
// select note_tags.note_id from note_tags where note_tags.tag_id IN (select tags.id from tags where tags.title like ?)
// )
// SELECT *
// FROM notes_fts
// WHERE 1 AND rowid IN (select notes.ROWID from tag_filter join notes on tag_filter.id=notes.id) AND notes_fts MATCH ?;

export function queryBuilder(filters: Map<string, Array<Term>>) {
	let query;
	const queryParts = [];
	const params = [];
	const withs = [];

	queryParts.push(`SELECT
	notes_fts.id,
	notes_fts.title AS normalized_title,
	notes_fts.is_todo,
	notes_fts.todo_completed,
	notes_fts.parent_id
	FROM notes_fts WHERE 1`);

	if (filters.has('tag')) {
		queryParts.push('AND ROWID IN (SELECT notes.ROWID from (tag_filter) JOIN notes on tag_filter.id=notes.id)');
		withs.push(tagFilter(filters.get('tag')));
		filters.get('tag').forEach((term) => params.push(term.value));
	}

	if (filters.has('notebook')) {
		// currently only supports one notebook
		const term = filters.get('notebook')[0];
		queryParts.push(`AND ROWID ${term.relation === 'NOT' ? 'NOT' : ''} IN (SELECT notes.ROWID from (child_notebooks) JOIN notes on notes.parent_id=child_notebooks.id)`);
		withs.push(noteBookFilter());
		params.push(term.value);
	}

	if (filters.has('created')) {
		makeDateFilter('created', filters, queryParts, params);
	}

	if (filters.has('updated')) {
		makeDateFilter('updated', filters, queryParts, params);
	}

	if (filters.has('title') || filters.has('body') || filters.has('text')) {
		// there is something to fts search
		queryParts.push('AND notes_fts MATCH ?');
		let match: Array<string> = [];

		if (filters.has('title')) {
			match = [...match, ...makeMatchQuery('title', filters)];
		}
		if (filters.has('body')) {
			match = [...match, ...makeMatchQuery('body', filters)];
		}
		if (filters.has('text')) {
			match = [...match, ...makeMatchQuery('text', filters)];
		}
		params.push(match.join(' ').trim()); // Fix: OR at front?
	}

	if (withs.length > 0) {
		query = ['WITH RECURSIVE' , withs.join(',') ,queryParts.join(' ')].join(' ');
	} else {
		query = queryParts.join(' ');
	}

	return { query, params };
}
