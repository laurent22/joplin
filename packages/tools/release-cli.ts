import { execCommand2, rootDir, completeReleaseWithChangelog } from './tool-utils';

const appDir = `${rootDir}/packages/app-cli`;
const changelogPath = `${rootDir}/readme/changelog_cli.md`;

// Start with node Tools/release-cli.js --changelog-from cli-v1.0.126
// to specify from where the changelog should be created
async function main() {
	process.chdir(appDir);

	await execCommand2('git pull');

	const newVersion = (await execCommand2('npm version patch')).trim();
	console.info(`Building ${newVersion}...`);
	const newTag = `cli-${newVersion}`;

	await execCommand2('touch app/main.js');
	await execCommand2('yarn run build');
	await execCommand2('cp ../../README.md build/');

	process.chdir(`${appDir}/build`);

	await execCommand2('npm publish');

	await completeReleaseWithChangelog(changelogPath, newVersion, newTag, 'CLI', false);
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	console.error('');
	console.error('If the app cannot auto-detect the previous tag name, specify it using --changelog-from TAG_NAME');
	process.exit(1);
});
