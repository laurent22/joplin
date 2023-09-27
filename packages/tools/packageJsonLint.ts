import { execCommand, getRootDir } from '@joplin/utils';
import { chdir } from 'process';

const main = async () => {
	// Having no output seems to cause lint-staged to fail on some systems.
	// Add a console.log statement to work around this issue.
	console.log('Linting package.json files...');

	const rootDir = await getRootDir();
	chdir(rootDir);
	await execCommand('yarn run npmPkgJsonLint --configFile .npmpackagejsonlintrc.json --quiet .');
};

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
