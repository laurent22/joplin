interface Term {
  relation: string;
  value: string;
}

const tagFilter = (tags: Array<Term>) => {
	const noteIdsFromTag = 'SELECT note_tags.note_id FROM note_tags WHERE note_tags.tag_id IN (SELECT tags.id from tags WHERE tags.title LIKE ?)';
	let result = tags.map(tag => `${tag.relation == 'AND' ? 'INTERSECT' : 'UNION'} ${noteIdsFromTag}`).join(' ');
	result = `SELECT note_tags.note_id as id FROM note_tags WHERE 1 ${result}`;
	result = `tag_filter as (${result})`;
	return result;
};

// The query we want to construct is this:
// with tag_filter as
// (
// select note_tags.note_id as id from note_tags
// where 1
// (intersect/union/except)
// select note_tags.note_id from note_tags where note_tags.tag_id IN (select tags.id from tags where tags.title like ?)
// )
// SELECT
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
	notes_fts.created_time,
	notes_fts.updated_time,
	notes_fts.is_todo,
	notes_fts.todo_completed,
	notes_fts.parent_id
	FROM notes_fts WHERE 1`);

	// create a tag filter
	if (filters.has('tag')) {
		queryParts.push('AND ROWID IN (SELECT notes.ROWID from (tag_filter) JOIN notes on tag_filter.id=notes.id)');
		withs.push(tagFilter(filters.get('tag')));
		filters.get('tag').forEach((term) => params.push(term.value));
	}

	if (filters.has('title') || filters.has('body') || filters.has('text')) {
		// there is something to fts search
		queryParts.push('AND notes_fts MATCH ?');
		let match: Array<string> = [];

		if (filters.has('title')) {
			match = match.concat(filters.get('title').map(term => `${term.relation === 'AND' ? '' : `${term.relation} `}title:${term.value}`));
		}
		if (filters.has('body')) {
			match = match.concat(filters.get('body').map(term => `${term.relation === 'AND' ? '' : `${term.relation} `}body:${term.value}`));
		}
		if (filters.has('text')) {
			match = match.concat(filters.get('text').map(term => `${term.relation === 'AND' ? '' : `${term.relation} `}${term.value}`));
		}

		params.push(match.join(' ').trim()); // Fix: OR at front?
	}

	if (withs.length > 0) {
		query = ['WITH' , withs.join(',') ,queryParts.join(' ')].join(' ');
	} else {
		query = queryParts.join(' ');
	}

	return { query, params };
}
