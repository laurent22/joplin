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
				if (term.relation === 'AND') return `${keyword}:${term.value}`;
				else return `${term.relation} ${keyword}:${term.value}`;
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


	const params = [match.trim()]; // TO Do: handle case where match has OR as the first word

	const query = `SELECT
	notes_fts.id,
	notes_fts.title AS normalized_title,
	offsets(notes_fts) AS offsets,
	notes.title,
	notes.user_updated_time,
	notes.is_todo,
	notes.todo_completed,
	notes.parent_id
	FROM notes_fts
	LEFT JOIN notes ON notes_fts.id = notes.id
	WHERE notes_fts MATCH (?)`;

	return { query, params };
};
