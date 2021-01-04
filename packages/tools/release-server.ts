import * as fs from 'fs-extra';
const { execCommand, execCommandVerbose, rootDir, gitPullTry } = require('./tool-utils.js');

const serverDir = `${rootDir}/packages/server`;
const readmePath = `${serverDir}/README.md`;

async function updateReadmeLinkVersion(version: string) {
	const content = await fs.readFile(readmePath, 'utf8');
	const newContent = content.replace(/server-v(.*?).tar.gz/g, `server-${version}.tar.gz`);
	if (content === newContent) throw new Error(`Could not change version number in ${readmePath}`);
	await fs.writeFile(readmePath, newContent, 'utf8');
}

async function main() {
	process.chdir(serverDir);

	console.info(`Running from: ${process.cwd()}`);

	await gitPullTry();

	const version = (await execCommand('npm version patch')).trim();
	const tagName = `server-${version}`;

	console.info(`New version number: ${version}`);

	await updateReadmeLinkVersion(version);

	await execCommandVerbose('git', ['add', '-A']);
	await execCommandVerbose('git', ['commit', '-m', `Server release ${version}`]);
	await execCommandVerbose('git', ['tag', tagName]);
	await execCommandVerbose('git', ['push']);
	await execCommandVerbose('git', ['push', '--tags']);
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
