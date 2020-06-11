const { time } = require('lib/time-utils.js');

const tagFilter = (tags: string[]) => {
	let result = new Array(tags.length).fill('INTERSECT SELECT note_tags.note_id FROM note_tags WHERE note_tags.tag_id IN (SELECT tags.id from tags WHERE tags.title LIKE ?)').join(' ');
	result = `SELECT note_tags.note_id as id FROM note_tags WHERE 1 ${result}`;
	result = `tag_filter as (${result})`;
	return result;
};

const noteBookFilter = (names: string[]) => {
	const likes = new Array(names.length).fill('folders.title LIKE ?');
	return `child_notebooks(id) as (select folders.id from folders where id IN (select id from folders where ${likes.join(' OR ')})
union all select folders.id from folders JOIN child_notebooks on folders.parent_id=child_notebooks.id)`;
};

const hyphenateDate = (date: string) => `${date.slice(0,4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;

const getUnixMs = (date:string) => Date.parse(hyphenateDate(date));

const makeDateFilter = (type: string, filters: Map<string, string[]>, queryParts: string[], params: string[]): void => {
	// make it simple with created meaning >= and -created meaning <= ? with support for partial YYYYMMDD and smart values like (day, week, month, year)
	const smartValue = /^(day|week|month|year)-([0-9]+)$/i;
	const yyyymmdd = /^[0-9]{8}$/;
	const yyyymmdd_yyyymmdd = /^[0-9]{8}\.\.[0-9]{8}$/;
	const yyyymm_yyyymm = /^[0-9]{6}\.\.[0-9]{6}$/;
	const yyyy_yyyy = /^[0-9]{4}\.\.[0-9]{4}$/;

	let value = filters.get(type)[0]; // only one date is supported

	let relation = 'EQUAL';
	if (value.startsWith('<')) {
		relation = 'LESS';
		value = value.slice(1);
	} else if (value.startsWith('>')) {
		relation = 'GREATER';
		value = value.slice(1);
	}

	if (smartValue.test(value)) {
		const match = smartValue.exec(value);
		const timeDuration = match[1]; // eg. day, week, month, year
		const number = parseInt(match[2], 10); // eg. 1, 12, 101
		const timeFrom = time.goBackInTime(number, timeDuration); // eg. goBackInTime(1, 'day')
		queryParts.push(`AND ROWID IN (SELECT ROWID from notes_normalized where notes_normalized.user_${type}_time >= ?)`);
		params.push(timeFrom);
	} else if (yyyymmdd.test(value)) {
		const msOfDay = getUnixMs(value); // unixMs from YYYYMMDD
		const msOfNextDay = msOfDay + (60 * 60 * 24 * 1000);

		if (relation == 'LESS') {
			queryParts.push(`AND ROWID IN (SELECT ROWID from notes_normalized where notes_normalized.user_${type}_time < ?)`);
			params.push(msOfNextDay.toString());
		} else if (relation == 'GREATER') {
			queryParts.push(`AND ROWID IN (SELECT ROWID from notes_normalized where notes_normalized.user_${type}_time >= ?)`);
			params.push(msOfDay.toString());
		} else {
			queryParts.push(`AND ROWID IN (SELECT ROWID from notes_normalized where notes_normalized.user_${type}_time >= ? AND notes_normalized.user_${type}_time < ?)`);
			params.push(msOfDay.toString(), msOfNextDay.toString());
		}

	} else if (yyyymmdd_yyyymmdd.test(value)) {
		const [date1, date2] = value.split('..');
		const startDate = getUnixMs(date1);
		const endDate = getUnixMs(date2) + (60 * 60 * 24 * 1000); // start of next day
		queryParts.push(`AND ROWID IN (SELECT ROWID from notes_normalized where notes_normalized.user_${type}_time >= ? AND notes_normalized.user_${type}_time < ?)`);
		params.push(startDate.toString(), endDate.toString());
	} else if (yyyymm_yyyymm.test(value)) {
		let [date1, date2] = value.split('..');


		// find start of the next month
		let endYear = date2.slice(0, 4);
		let endMonth = date2.slice(-2);

		const incYear = ((Number(endMonth) + 1) / 12) > 1.0;
		endMonth = ((Number(endMonth) + 1) % 12).toString();
		if (endMonth.length == 1) endMonth = `0${endMonth}`;
		if (incYear) endYear = (Number(endYear) + 1).toString();

		date1 = `${date1}01`; // make day start from the 1st day of the month
		date2 = `${endYear + endMonth}01`; // first day of the next month

		const startDate = getUnixMs(date1);
		const endDate = getUnixMs(date2) + (60 * 60 * 24 * 1000); // start of next day
		queryParts.push(`AND ROWID IN (SELECT ROWID from notes_normalized where notes_normalized.user_${type}_time >= ? AND notes_normalized.user_${type}_time < ?)`);
		params.push(startDate.toString(), endDate.toString());
	} else if (yyyy_yyyy.test(value)) {
		let [date1, date2] = value.split('..');

		date1 = `${date1}0101`; // make day start from the 1st day of the month and first month of year
		date2 = `${(Number(date2) + 1).toString()}0101`;

		const startDate = getUnixMs(date1);
		const endDate = getUnixMs(date2); // start of next day
		queryParts.push(`AND ROWID IN (SELECT ROWID from notes_normalized where notes_normalized.user_${type}_time >= ? AND notes_normalized.user_${type}_time < ?)`);
		params.push(startDate.toString(), endDate.toString());
	} else {
		throw new Error(`Date value of ${type} in unknown format: ${value}`);
	}
};

const makeMatchQuery = (name: string, filters:Map<string, string[]>) => {
	if (name === 'title' || name === 'body') {
		return filters.get(name).map(value => `${name}:${value}`);
	} else if (name === 'text') {
		return filters.get(name);// else if (term.relation === 'NOT') { return `-${term.value}`; } else { return `${term.relation} ${term.value}`; }
	} else if (name === '-text') {
		return filters.get(name).map(value => `-${value}`);
	} else {
		throw new Error(`Invalid filter for match query: ${name}`);
	}
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

export default function queryBuilder(filters: Map<string, string[]>) {
	let query;
	const queryParts: string[] = [];
	const params: string[] = [];
	const withs: string[] = [];

	queryParts.push(`SELECT
	notes_fts.id,
	notes_fts.title,
	offsets(notes_fts) AS offsets,
	notes_fts.user_updated_time,
	notes_fts.is_todo,
	notes_fts.todo_completed,
	notes_fts.parent_id
	FROM notes_fts WHERE 1`);

	// console.log("testing beep beep boop boop")
	// console.log(filters);

	if (filters.has('tag')) {
		const values = filters.get('tag');
		withs.push(tagFilter(values));
		values.forEach((value) => params.push(value));
		queryParts.push('AND ROWID IN (SELECT notes_normalized.ROWID from (tag_filter) JOIN notes_normalized on tag_filter.id=notes_normalized.id)');
	}

	if (filters.has('-tag')) {
		const values = filters.get('-tag');
		withs.push(tagFilter(values));
		values.forEach((value) => params.push(value));
		queryParts.push('AND ROWID NOT IN (SELECT notes_normalized.ROWID from (tag_filter) JOIN notes_normalized on tag_filter.id=notes_normalized.id)');
	}

	if (filters.has('notebook')) {
		const values = filters.get('notebook');
		withs.push(noteBookFilter(values));
		values.forEach(value => params.push(value));
		queryParts.push('AND ROWID IN (SELECT notes_normalized.ROWID from (child_notebooks) JOIN notes_normalized on child_notebooks.id=notes_normalized.parent_id)');
	}

	// negated notebooks?

	if (filters.has('type')) {
		const value = filters.get('type')[0];
		if (value === 'todo') {
			queryParts.push('AND ROWID IN (SELECT ROWID from notes_normalized where notes_normalized.is_todo = 1)');
		} else if (value == 'note') {
			queryParts.push('AND ROWID IN (SELECT ROWID from notes_normalized where notes_normalized.is_todo = 0)');
		} else {
			throw new Error(`Invalid argument for filter todo: ${value}`);
		}
	}

	if (filters.has('iscompleted')) {
		const value = filters.get('iscompleted')[0];
		if (value === 'true' || value === 'yes' || value === '1') {
			queryParts.push('AND ROWID IN (SELECT ROWID from notes_normalized where notes_normalized.is_todo = 1 AND notes_normalized.todo_completed != 0)');
		} else if (value === 'false' || value === 'no' || value === '0') {
			queryParts.push('AND ROWID IN (SELECT ROWID from notes_normalized where notes_normalized.is_todo = 1 AND notes_normalized.todo_completed = 0)');
		} else {
			throw new Error(`Invalid argument for filter iscompleted: ${value}`);
		}
	}

	if (filters.has('created')) {
		makeDateFilter('created', filters, queryParts, params);
	}

	if (filters.has('updated')) {
		makeDateFilter('updated', filters, queryParts, params);
	}

	if (filters.has('title') || filters.has('body') || filters.has('text') || filters.has('-text')) {
		// there is something to fts search
		queryParts.push('AND notes_fts MATCH ?');
		let match: string[] = [];

		if (filters.has('title')) {
			match = [...match, ...makeMatchQuery('title', filters)];
		}
		if (filters.has('body')) {
			match = [...match, ...makeMatchQuery('body', filters)];
		}
		if (filters.has('text')) {
			match = [...match, ...makeMatchQuery('text', filters)];
		}
		if (filters.has('-text')) {
			match = [...match, ...makeMatchQuery('-text', filters)];
		}
		params.push(match.join(' ').trim());
	}


	if (filters.has('-title')) {
		queryParts.push('AND ROWID NOT IN (SELECT ROWID FROM notes_fts WHERE notes_fts.title MATCH ?)');
		params.push(filters.get('-title').join(' OR '));
	}

	if (filters.has('-body')) {
		queryParts.push('AND ROWID NOT IN (SELECT ROWID FROM notes_fts WHERE notes_fts.body MATCH ?)');
		params.push(filters.get('-body').join(' OR '));
	}

	if (withs.length > 0) {
		query = ['WITH RECURSIVE' , withs.join(',') ,queryParts.join(' ')].join(' ');
	} else {
		query = queryParts.join(' ');
	}

	return { query, params };
}
