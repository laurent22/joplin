module.exports = {
	// # About TypeScript compilation
	//
	// Don't compile when committing as it will process all TS files in the monorepo, which is too
	// slow. Errors should be checked during development using `yarn watch`.
	//
	// Or if we add this back, we could do something like this:
	// https://stackoverflow.com/a/44748041/561309
	//
	// The script would check where the TS file is located, then use the right tsconfig.json file
	// along with the tsconfig override.
	//
	// # Running tasks in parallel
	//
	// lint-staged does not allow running concurrent tasks for the same extension, because multiple
	// tasks might modify the same files. This doesn't apply to us because only one task modifies
	// files (the linter task) while others only notify about errors. So to go around this we add
	// this fake extension "task?" to make lint-staged think those are different extension tasks
	// that can run in parallel.
	//
	// See https://github.com/lint-staged/lint-staged/issues/934#issuecomment-743299357
	'*.{js,jsx,ts,tsx,task1}': 'yarn checkIgnoredFiles',
	'*.{js,jsx,ts,tsx,task2}': 'yarn spellcheck',
	'*.{js,jsx,ts,tsx,task3}': 'yarn packageJsonLint',
	'*.{js,jsx,ts,tsx,task4}': 'yarn linter-precommit',
	'*.{md,mdx,task5}': 'yarn spellcheck',
	'*.{md,mdx,task6}': 'yarn validateFilenames',
};
