const { execCommand, githubRelease, handleCommitHook, githubOauthToken } = require('./tool-utils.js');
const path = require('path');
const fs = require('fs-extra');
const moment = require('moment');

const rootDir = path.dirname(__dirname);
const appDir = rootDir + '/CliClient';

async function insertChangelog(tag, changelog) {
	const currentText = await fs.readFile(rootDir + '/readme/changelog_cli.md', 'UTF-8');
	const lines = currentText.split('\n');

	const beforeLines = [];
	const afterLines = [];

	for (const line of lines) {
		if (afterLines.length) {
			afterLines.push(line);
			continue;
		}

		if (line.indexOf('##') === 0) {
			afterLines.push(line);
			continue;
		}

		beforeLines.push(line);
	}

	const header = [
		'##',
		'[' + tag + ']',
		'(https://github.com/laurent22/joplin/releases/tag/' + tag + ')',
		'-',
		moment.utc().format('YYYY-MM-DD\THH:mm:ss') + 'Z',
	];

	let newLines = [];
	newLines.push(header.join(' '));
	newLines.push('');
	newLines = newLines.concat(changelog.split('\n'));
	newLines.push('');

	const output = beforeLines.concat(newLines).concat(afterLines);

	console.info(header);

	// console.info(beforeLines);
	// console.info("****************************");
	// console.info(afterLines);
}

// Start with node Tools/release-cli.js --changelog-from cli-v1.0.126
// to specify from where the changelog should be created
async function main() {
	const argv = require('yargs').argv;

	// SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
	// ROOT_DIR="$SCRIPT_DIR/.."

	// # LAST_VERSION=$(cat package.json | jq -r .version)

	// cd "$SCRIPT_DIR"
	// npm version patch
	// touch "$SCRIPT_DIR/app/main.js"
	// bash $SCRIPT_DIR/build.sh
	// cp "$SCRIPT_DIR/package.json" build/
	// cp "$SCRIPT_DIR/../README.md" build/
	// cd "$SCRIPT_DIR/build"
	// npm publish


	// git add -A
	// git commit -m "CLI v$NEW_VERSION"
	// git tag "cli-v$NEW_VERSION"
	// git push && git push --tags

	process.chdir(appDir);

	const packageJson = await fs.readFile('package.json', 'UTF-8'); 
	const packageConf = JSON.parse(packageJson);

	const previousVersion = packageConf.version;
	let changelogFrom = 'cli-v' + previousVersion;

	if (argv.changelogFrom) changelogFrom = argv.changelogFrom;

	const newVersion = await execCommand('npm version patch');
	console.info('Building ' + newVersion);
	const newTag = 'cli-v' + newVersion;
	
	await execCommand('touch app/main.js');
	await execCommand('bash build.sh');
	await execCommand('cp package.json build/');
	await execCommand('cp ../README.md build/');

	const changelog = await execCommand('node ../Tools/git-changelog ' + changelogFrom);

	await insertChangelog(newTag, changelog);


	// const argv = require('yargs').argv;

	// const oauthToken = await githubOauthToken();
	// process.chdir(appDir);

	// console.info('Running from: ' + process.cwd());

	// const version = (await execCommand('npm version patch')).trim();
	// const tagName = version;

	// console.info('New version number: ' + version);

	// console.info(await execCommand('git add -A'));
	// console.info(await execCommand('git commit -m "Electron release ' + version + '"'));
	// console.info(await execCommand('git tag ' + tagName));
	// console.info(await execCommand('git push && git push --tags'));

	// const releaseOptions = { isDraft: true, isPreRelease: !!argv.beta };

	// console.info('Release options: ', releaseOptions);

	// const release = await githubRelease('joplin', tagName, releaseOptions);

	// console.info('Created GitHub release: ' + release.html_url);
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});