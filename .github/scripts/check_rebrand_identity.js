#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '../..');
const exceptionsPath = path.join(repoRoot, 'readme/dev/rebrand_identity_guard_exceptions.json');

const shipCriticalPrefixes = [
	'package.json',
	'.github/',
	'packages/app-desktop/',
	'packages/app-mobile/',
	'packages/app-cli/',
	'packages/app-clipper/',
	'packages/server/',
	'packages/tools/',
];

const disallowedPatterns = [
	/joplin:\/\//gi,
	/\bnet\.cozic\b/g,
	/\bjoplinapp\.org\b/g,
	/\bjoplincloud\.com\b/g,
	/\bobjects\.joplinusercontent\.com\b/g,
	/\blaurent22\/joplin\b/g,
];

const parseArgs = () => {
	const args = process.argv.slice(2);
	const options = { baseRef: null };

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === '--base' && args[i + 1]) {
			options.baseRef = args[i + 1];
			i++;
		}
	}

	return options;
};

const loadExceptions = () => {
	try {
		const raw = fs.readFileSync(exceptionsPath, 'utf8');
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed.pathExemptions) ? parsed.pathExemptions : [];
	} catch (error) {
		console.error(`Failed to read exceptions file at ${exceptionsPath}:`, error.message);
		process.exit(1);
	}
};

const runGit = args => {
	return execFileSync('git', args, {
		cwd: repoRoot,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	}).trim();
};

const getDiffRange = options => {
	if (options.baseRef) return `${options.baseRef}...HEAD`;
	if (process.env.GITHUB_BASE_REF) return `origin/${process.env.GITHUB_BASE_REF}...HEAD`;
	return 'HEAD';
};

const isShipCriticalFile = filePath => {
	return shipCriticalPrefixes.some(prefix => filePath === prefix || filePath.startsWith(prefix));
};

const isPathExempted = (filePath, exemptions) => exemptions.includes(filePath);

const getChangedFiles = range => {
	const output = runGit(['diff', '--name-only', '--diff-filter=ACMR', range]);
	if (!output) return [];
	return output.split('\n').map(line => line.trim()).filter(Boolean);
};

const getAddedLinesByFile = (range, files) => {
	const linesByFile = new Map();
	for (const file of files) {
		const patch = runGit(['diff', '--no-color', '--unified=0', range, '--', file]);
		if (!patch) continue;
		const lines = patch
			.split('\n')
			.filter(line => line.startsWith('+') && !line.startsWith('+++'))
			.map(line => line.slice(1));
		if (lines.length) linesByFile.set(file, lines);
	}
	return linesByFile;
};

const findViolations = addedLinesByFile => {
	const violations = [];
	for (const [file, lines] of addedLinesByFile.entries()) {
		lines.forEach((line, index) => {
			for (const regex of disallowedPatterns) {
				regex.lastIndex = 0;
				if (regex.test(line)) {
					violations.push({
						file,
						lineNumber: index + 1,
						pattern: regex.toString(),
						line,
					});
				}
			}
		});
	}
	return violations;
};

const main = () => {
	const options = parseArgs();
	const exemptions = loadExceptions();
	const range = getDiffRange(options);
	const changedFiles = getChangedFiles(range);
	const candidateFiles = changedFiles
		.filter(isShipCriticalFile)
		.filter(file => !isPathExempted(file, exemptions));

	if (!candidateFiles.length) {
		console.log('Rebrand identity guard: no ship-critical changed files to scan.');
		return;
	}

	const addedLinesByFile = getAddedLinesByFile(range, candidateFiles);
	const violations = findViolations(addedLinesByFile);

	if (!violations.length) {
		console.log(`Rebrand identity guard: scanned ${candidateFiles.length} file(s), no legacy identifiers found in added lines.`);
		return;
	}

	console.error('Rebrand identity guard: found disallowed legacy identifiers in added lines:');
	for (const violation of violations) {
		console.error(`- ${violation.file} [added-line:${violation.lineNumber}] matches ${violation.pattern}`);
		console.error(`  ${violation.line}`);
	}
	console.error('\nIf intentional, add the file path to readme/dev/rebrand_identity_guard_exceptions.json and document why.');
	process.exit(1);
};

main();
