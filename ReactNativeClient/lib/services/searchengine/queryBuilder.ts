const { time } = require('lib/time-utils.js');

const tagFilter = (tags: string[], intersect: boolean = true, negated: boolean = false) => {
	let result = new Array(tags.length).fill(`${intersect ? 'INTERSECT' : 'UNION'} SELECT note_tags.note_id FROM note_tags WHERE note_tags.tag_id IN (SELECT tags.id from tags WHERE tags.title LIKE ?)`).join(' ');
	result = intersect ? `SELECT note_tags.note_id as id FROM note_tags WHERE 1 ${result}` : `SELECT note_tags.note_id as id FROM note_tags WHERE 0 ${result}`;
	result = negated ? `tag_filter_negated as (${result})` : `tag_filter as (${result})`;
	return result;
};

const noteBookFilter = (names: string[], negated: boolean = false) => {
	const likes = new Array(names.length).fill('folders.title LIKE ?');
	if (negated) {
		return `child_notebooks_negated(id) as (select folders.id from folders where id IN (select id from folders where ${likes.join(' OR ')})
		union all select folders.id from folders JOIN child_notebooks_negated on folders.parent_id=child_notebooks_negated.id)`;
	} else {
		return `child_notebooks(id) as (select folders.id from folders where id IN (select id from folders where ${likes.join(' OR ')})
		union all select folders.id from folders JOIN child_notebooks on folders.parent_id=child_notebooks.id)`;
	}
};

const hyphenateDate = (date: string) => `${date.slice(0,4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;

const getUnixMs = (date:string) => Date.parse(hyphenateDate(date));

const getNextMonthDate = (value: string) : string => {
	let endYear = value.slice(0, 4);
	let endMonth = value.slice(-2);
	const incYear: boolean = ((Number(endMonth) + 1) / 12) > 1.0;
	endMonth = ((Number(endMonth) + 1) % 12).toString();
	if (endMonth.length == 1) endMonth = `0${endMonth}`;
	if (incYear) endYear = (Number(endYear) + 1).toString();
	return `${endYear + endMonth}01`;
};

const makeDateFilter = (type: string, values: string[], queryParts: string[], params: string[], negated: boolean = false): void => {
	const yyyymmdd = /^[0-9]{8}$/;
	const yyyymm = /^[0-9]{6}$/;
	const yyyy = /^[0-9]{4}$/;
	const smartValue = /^(day|week|month|year)-([0-9]+)$/i;

	const msInDay = 60 * 60 * 24 * 1000;

	values.forEach(value => {
		queryParts.push(`AND ROWID IN (SELECT ROWID from notes_normalized where notes_normalized.user_${type}_time ${negated ? '<' : '>='} ?)`);
		if (yyyymmdd.test(value)) {
			const msOfDay = getUnixMs(value);
			const msOfNextDay = msOfDay + msInDay;
			negated ? params.push(msOfNextDay.toString()) : params.push(msOfDay.toString()) ;
		} else if (yyyymm.test(value)) {
			const msOfMonth = getUnixMs(`${value}01`); // make day start from the 1st day of the month
			const msOfNextMonth = getUnixMs(getNextMonthDate(value));
			negated ? params.push(msOfNextMonth.toString()) : params.push(msOfMonth.toString());
		} else if (yyyy.test(value)) {
			const msOfYear = getUnixMs(`${value}0101`); // make day start from the 1st day of the month 1st month of year
			const msOfNextYear = getUnixMs(`${(Number(value) + 1).toString()}0101`);
			negated ? params.push(msOfNextYear.toString()) : params.push(msOfYear.toString());
		} else if (smartValue.test(value)) {
			const match = smartValue.exec(value);
			const timeUnit = match[1]; // eg. day, week, month, year
			const n = Number(match[2]); // eg. 1, 12, 101
			const msStart = time.goBackInTime(n, timeUnit); // eg. goBackInTime(1, 'day')
			let msEnd = null;
			switch (timeUnit) {
			case 'day': msEnd = Number(msStart) + msInDay; break;
			case 'week': msEnd = Number(msStart) + (msInDay * 7); break;
			case 'month': msEnd = Number(msStart) + (msInDay * 7 * 30); break; // not accurate! maybe use goForwardInTime(startTime?, n, timeUnit)
			case 'year': msEnd = Number(msStart) + (msInDay * 7 * 30 * 12); break;  // not accurate!
			}
			negated ? params.push(msEnd.toString()) : params.push(msStart.toString());
		} else {
			throw new Error(`Date value of ${type} in unknown format: ${value}`);
		}
	});
};

const makeMatchQuery = (name: string, filters:Map<string, string[]>) => {
	if (name === 'title' || name === 'body') {
		return filters.get(name).map(value => `${name}:${value}`);
	} else if (name === 'text') {
		return filters.get(name);
	} else {
		throw new Error(`Invalid filter for match query: ${name}`);
	}
};

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

	// const defaultRelation = 'AND';
	// let relation = defaultRelation;

	// if (filters.has('any')) {
	// 	const value = filters.get('any')[0]; // Only consider the first any
	// 	if (value === '1') relation = 'OR';
	// }

	if (filters.has('tag')) {
		const values = filters.get('tag');
		withs.push(tagFilter(values));
		values.forEach((value) => params.push(value));
		queryParts.push('AND ROWID IN (SELECT notes_normalized.ROWID from (tag_filter) JOIN notes_normalized on tag_filter.id=notes_normalized.id)');
	}

	if (filters.has('-tag')) {
		const values = filters.get('-tag');
		withs.push(tagFilter(values, false, true));
		values.forEach((value) => params.push(value));
		queryParts.push('AND ROWID NOT IN (SELECT notes_normalized.ROWID from (tag_filter_negated) JOIN notes_normalized on tag_filter_negated.id=notes_normalized.id)');
	}

	if (filters.has('notebook')) {
		const values = filters.get('notebook');
		withs.push(noteBookFilter(values));
		values.forEach(value => params.push(value));
		queryParts.push('AND ROWID IN (SELECT notes_normalized.ROWID from (child_notebooks) JOIN notes_normalized on child_notebooks.id=notes_normalized.parent_id)');
	}

	if (filters.has('-notebook')) {
		const values = filters.get('-notebook');
		withs.push(noteBookFilter(values, true));
		values.forEach(value => params.push(value));
		queryParts.push('AND ROWID NOT IN (SELECT notes_normalized.ROWID from (child_notebooks_negated) JOIN notes_normalized on child_notebooks_negated.id=notes_normalized.parent_id)');
	}

	if (filters.has('type')) {
		const values = filters.get('type');
		values.forEach(value => {
			if (value === 'todo') {
				queryParts.push('AND ROWID IN (SELECT ROWID from notes_normalized where notes_normalized.is_todo = 1)');
			} else if (value == 'note') {
				queryParts.push('AND ROWID IN (SELECT ROWID from notes_normalized where notes_normalized.is_todo = 0)');
			} else {
				throw new Error(`Invalid argument for filter todo: ${value}`);
			}
		});
	}

	if (filters.has('iscompleted')) {
		const values = filters.get('iscompleted');
		values.forEach(value => {
			if (value === '1') {
				queryParts.push('AND ROWID IN (SELECT ROWID from notes_normalized where notes_normalized.is_todo = 1 AND notes_normalized.todo_completed != 0)');
			} else if (value === '0') {
				queryParts.push('AND ROWID IN (SELECT ROWID from notes_normalized where notes_normalized.is_todo = 1 AND notes_normalized.todo_completed = 0)');
			} else {
				throw new Error(`Invalid argument for filter iscompleted: ${value}`);
			}
		});
	}

	if (filters.has('created')) {
		makeDateFilter('created', filters.get('created'), queryParts, params);
	}

	if (filters.has('-created')) {
		makeDateFilter('created', filters.get('-created'), queryParts, params, true);
	}

	if (filters.has('updated')) {
		makeDateFilter('updated', filters.get('updated'), queryParts, params);
	}

	if (filters.has('-updated')) {
		makeDateFilter('updated', filters.get('-updated'), queryParts, params, true);
	}


	if (filters.has('title') || filters.has('body') || filters.has('text')) {
		// there is something to fts search
		queryParts.push('AND notes_fts MATCH ?');
		let match: string[] = [];

		if (filters.has('title')) {
			match = match.concat(makeMatchQuery('title', filters));
		}
		if (filters.has('body')) {
			match = match.concat(makeMatchQuery('body', filters));
		}
		if (filters.has('text')) {
			match = match.concat(makeMatchQuery('text', filters));
		}
		params.push(match.join(' ').trim());
	}

	if (filters.has('-text')) {
		queryParts.push('AND ROWID NOT IN (SELECT ROWID FROM notes_fts WHERE notes_fts MATCH ?)');
		params.push(filters.get('-text').join(' OR '));
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
