export default (num: number) => {
	const timestamp = Date.now();
	return { sql: 'INSERT INTO migrations (number, created_time, updated_time) VALUES (?, ?, ?)', params: [num, timestamp, timestamp] };
};
