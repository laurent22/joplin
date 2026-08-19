// Syntax errors have a code 0 (no error) so we need to check the message.
export default (sqliteError: { message?: string }) => {
	return sqliteError.message && sqliteError.message.includes('syntax error');
};
