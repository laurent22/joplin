// // npx lerna add --no-bootstrap --scope @joplin/plugin-repo-builder -D jest && npx lerna bootstrap --no-ci --include-dependents --include-dependencies --scope @joplin/plugin-repo-builder

// import { execCommand2, rootDir, gitPullTry } from './tool-utils.js';

// async function main() {
// 	const argv = require('yargs').argv;

// 	console.info(process.argv);

// 	const args = [];
// 	if (argv.D) args.push('-D');

// 	await execCommand2('npx lerna add --no-bootstrap --scope @joplin/plugin-repo-builder -D jest');

// 	//npx lerna add --no-bootstrap --scope @joplin/plugin-repo-builder -D jest && npx lerna bootstrap --no-ci --include-dependents --include-dependencies --scope @joplin/plugin-repo-builder
// 	// process.chdir(rootDir);
// 	// const version = (await execCommand2('npm version patch')).trim();
// 	// const versionShort = version.substr(1);
// 	// const tagName = `server-${version}`;

// 	// process.chdir(rootDir);
// 	// console.info(`Running from: ${process.cwd()}`);

// 	// await execCommand2(`docker build -t "joplin/server:${versionShort}" -f Dockerfile.server .`);
// 	// await execCommand2(`docker tag "joplin/server:${versionShort}" "joplin/server:latest"`);
// 	// await execCommand2(`docker push joplin/server:${versionShort}`);
// 	// await execCommand2('docker push joplin/server:latest');

// 	// await execCommand2('git add -A');
// 	// await execCommand2(`git commit -m 'Server release ${version}'`);
// 	// await execCommand2(`git tag ${tagName}`);
// 	// await execCommand2('git push');
// 	// await execCommand2('git push --tags');
// }

// main().catch((error) => {
// 	console.error('Fatal error');
// 	console.error(error);
// 	process.exit(1);
// });
