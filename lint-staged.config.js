module.exports = {
	'**/*.ts?(x)': () => 'npm run tsc',
	'*.{js,jsx,ts,tsx}': [
		'npm run linter-precommit',
		'git add',
	],
};
