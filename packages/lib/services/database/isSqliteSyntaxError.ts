// Syntax errors have a code 0 (no error) so we need to check the message.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export default (sqliteError: any) => {
	return sqliteError.message && sqliteError.message.includes('syntax error');
};
