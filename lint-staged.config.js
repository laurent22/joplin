module.exports = {
	'**/*.ts?(x)': () => 'npm run build',
	'*.{js,jsx,ts,tsx}': [
		'npm run linter',
		'git add',
	],
};
