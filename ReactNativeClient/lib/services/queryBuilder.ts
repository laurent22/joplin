interface Term {
  relation: string;
  value: string;
}

// Note: we might need to escape query for making it sql compatible
const matchStmtBuilder = (
	filters: Map<string, Array<Term>>,
	keyword: string
): string => {
	if (filters.has(keyword)) {
		return `${filters
			.get(keyword)
			.map((term) => {
				if (term.relation === 'AND') {
					if (keyword !== 'text') {
						return `${keyword}:${term.value}`;
					} else {
						return `${term.value}`;
					}
				} else {
					return `${term.relation} ${keyword}:${term.value}`;
				}
			})
			.join(' ')} `;
	}
	return '';
};


module.exports = (filters: Map<string, Array<Term>>) => {
	// console.log(filters);
	let match = '';
	match += matchStmtBuilder(filters, 'title');
	match += matchStmtBuilder(filters, 'body');
	match += matchStmtBuilder(filters, 'text');

	let query = `SELECT
	notes_fts.id,
	notes_fts.title AS normalized_title,
	offsets(notes_fts) AS offsets,
	notes.title,
	notes.user_updated_time,
	notes.is_todo,
	notes.todo_completed,
	notes.parent_id
	FROM notes_fts
	LEFT JOIN notes ON notes_fts.id = notes.id WHERE 1`;

	const params = [];

	if (match !== '') {
		// there is something to fts search
		query += ' AND notes_fts MATCH (?)';
		params.push(match.trim());
	}

	// create a tag filter
	if (filters.has('tag')) {
		query += ' AND notes.id IN (SELECT note_tags.note_id FROM note_tags WHERE 1';

		filters.get('tag').forEach((term) => {
			if (term.relation === 'AND') query += ' INTERSECT SELECT note_tags.note_id FROM note_tags WHERE note_tags.tag_id IN (select tags.id from tags WHERE tags.title LIKE ?)';
			else if (term.relation === 'OR') query += ' UNION SELECT note_tags.note_id FROM note_tags WHERE note_tags.tag_id IN (select tags.id from tags WHERE tags.title LIKE ?)';
			params.push(term.value);
		});
		query += ')';
	}

	return { query, params };
};
