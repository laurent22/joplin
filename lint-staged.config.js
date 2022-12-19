module.exports = {
	// Don't compile when committing as it will process all TS files in the
	// monorepo, which is too slow. Errors should be checked during development
	// using `npm run watch`.
	//
	// Or if we add this back, we could do something like this:
	// https://stackoverflow.com/a/44748041/561309
	//
	// The script would check where the TS file is located, then use the right
	// tsconfig.json file along with the tsconfig override.
	//
	// '**/*.ts?(x)': () => 'npm run tsc',
	'*.{js,jsx,ts,tsx}': [
		'yarn run linter-precommit',
		'yarn run checkLibPaths',
		// 'yarn run spellcheck',
		// 'git add',
	],
};
