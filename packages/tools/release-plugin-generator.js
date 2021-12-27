const { execCommand, execCommandVerbose, rootDir, gitPullTry, setPackagePrivateField } = require('./tool-utils.js');

const genDir = `${rootDir}/packages/generator-joplin`;

async function main() {
	process.chdir(genDir);

	const packageFilePath = `${genDir}/package.json`;

	console.info(`Running from: ${process.cwd()}`);

	await gitPullTry();

	const version = (await execCommand('npm version patch')).trim();
	const tagName = `plugin-generator-${version}`;

	console.info(`New version number: ${version}`);

	await execCommandVerbose('bash', ['updateTypes.sh']);

	await setPackagePrivateField(packageFilePath, false);
	try {
		await execCommandVerbose('npm', ['publish']);
	} finally {
		await setPackagePrivateField(packageFilePath, true);
	}

	await gitPullTry();
	await execCommandVerbose('git', ['add', '-A']);
	await execCommandVerbose('git', ['commit', '-m', `Plugin Generator release ${version}`]);
	await execCommandVerbose('git', ['tag', tagName]);
	await execCommandVerbose('git', ['push']);
	await execCommandVerbose('git', ['push', '--tags']);
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
