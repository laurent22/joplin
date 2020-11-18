const { execCommandVerbose, rootDir } = require('./tool-utils.js');

const genDir = `${rootDir}/packages/generator-joplin`;

async function main() {
	process.chdir(genDir);

	console.info(`Running from: ${process.cwd()}`);

	console.info(await execCommandVerbose('git', ['pull']));

	const version = (await execCommandVerbose('npm', ['version', 'patch'])).trim();
	const tagName = `plugin-generator-${version}`;

	console.info(`New version number: ${version}`);

	console.info(await execCommandVerbose('npm', ['publish']));
	console.info(await execCommandVerbose('git', ['add', '-A']));
	console.info(await execCommandVerbose('git', ['commit', '-m', `Plugin Generator release ${version}`]));
	console.info(await execCommandVerbose('git', ['tag', tagName]));
	console.info(await execCommandVerbose('git', ['push']));
	console.info(await execCommandVerbose('git', ['push', '--tags']));
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
