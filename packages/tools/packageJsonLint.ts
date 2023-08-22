import { execCommand, getRootDir } from '@joplin/utils';
import { chdir } from 'process';

const main = async () => {
	const rootDir = await getRootDir();
	chdir(rootDir);
	await execCommand('yarn run npmPkgJsonLint --configFile .npmpackagejsonlintrc.json --quiet .');
};

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
