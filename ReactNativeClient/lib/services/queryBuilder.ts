interface Filter {
  name: string;
  relation: string;
  value: string;
}

// Note: we might need to escape query for making it sql compatible

module.exports = (filters: Array<Filter>): any => {
	let match = '';
	// first create the mandatory FTS match
	const required_filters = filters.filter(
		(f) => f.name == 'title' || f.name == 'body'
	);
	for (const filter of required_filters) {
		// build arg for FTS match
		// quotes inside quotes can be escaped by putting another quote
		match += `${filter.relation} ${filter.name}:${filter.value} `;
	}

	const params = [match.trim()];

	//   let where = "1";
	//   let params = [];

	//   const optional_filters = filters.filter(f => (f.name!="title" && f.name!="body"))
	//   for (const filter of optional_filters) {
	//       // build arg for FTS match
	//       where += " " + filter.relation + " ";
	//       if (filter.name == "") {
	//         where += ""
	//         params.push(filter.value);
	//       }
	//     }

	const query = `SELECT
        notes_fts.id,
        notes_fts.title,
        notes_fts.body,
        offsets(notes_fts) AS offsets,
        notes.title,
        notes.user_updated_time,
        notes.is_todo,
        notes.todo_completed,
        notes.parent_id
    FROM notes_fts
    LEFT JOIN notes ON notes_fts.id = notes.id
    WHERE
    notes_fts MATCH ?`;

	// const query = `SELECT ${selectedColumns} FROM notes
	//         ${Object.values(joins).join('\r\n')}
	//           WHERE
	//             notes.isDeleted = 0
	//             AND (${where})
	//           GROUP BY notes.noteId
	//           ORDER BY ${orderBy.join(", ")}`;

	return { query, params };
};
