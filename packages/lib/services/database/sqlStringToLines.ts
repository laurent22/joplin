export default (sql: string) => {
	const output = [];
	const lines = sql.split('\n');
	let statement = '';
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line === '') continue;
		if (line.substr(0, 2) === '--') continue;
		statement += line.trim();
		if (line[line.length - 1] === ',') statement += ' ';
		if (line[line.length - 1] === ';') {
			output.push(statement);
			statement = '';
		}
	}
	return output;
};
