const { execCommand } = require('./tool-utils.js');
const path = require('path');
const fs = require('fs-extra');
const moment = require('moment');

const rootDir = path.dirname(__dirname);
const appDir = `${rootDir}/CliClient`;
const changelogPath = `${rootDir}/readme/changelog_cli.md`;

async function insertChangelog(tag, changelog) {
	const currentText = await fs.readFile(changelogPath, 'UTF-8');
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
		`[${tag}](https://github.com/laurent22/joplin/releases/tag/${tag})`,
		'-',
		// eslint-disable-next-line no-useless-escape
		`${moment.utc().format('YYYY-MM-DD\THH:mm:ss')}Z`,
	];

	let newLines = [];
	newLines.push(header.join(' '));
	newLines.push('');
	newLines = newLines.concat(changelog.split('\n'));
	newLines.push('');

	const output = beforeLines.concat(newLines).concat(afterLines);

	return output.join('\n');
}

// Start with node Tools/release-cli.js --changelog-from cli-v1.0.126
// to specify from where the changelog should be created
async function main() {
	process.chdir(appDir);

	const newVersion = await execCommand('npm version patch');
	console.info(`Building ${newVersion}...`);
	const newTag = `cli-${newVersion}`;

	await execCommand('git pull');
	await execCommand('touch app/main.js');
	await execCommand('npm run build');
	await execCommand('cp package.json build/');
	await execCommand('cp ../README.md build/');

	process.chdir(`${appDir}/build`);

	await execCommand('npm publish');

	const changelog = await execCommand(`node ${rootDir}/Tools/git-changelog ${newTag}`);

	const newChangelog = await insertChangelog(newTag, changelog);

	await fs.writeFile(changelogPath, newChangelog);

	const defaultEditor = await execCommand('echo $EDITOR');

	const finalCmds = [
		'git add -A',
		`git commit -m "CLI ${newVersion}"`,
		`git tag "cli-${newVersion}"`,
		'git push',
		'git push --tags',
	];

	console.info('');
	console.info('Verify that the changelog is correct:');
	console.info('');
	console.info(`${defaultEditor} "${changelogPath}"`);
	console.info('');
	console.info('Then run these commands:');
	console.info('');
	console.info(finalCmds.join(' && '));
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	console.error('');
	console.error('If the app cannot auto-detect the previous tag name, specify it using --changelog-from TAG_NAME');
	process.exit(1);
});
