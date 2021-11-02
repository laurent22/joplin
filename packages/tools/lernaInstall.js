// Lerna doesn't provide any sensible way to add a package to a sub-package
// without bootstrapping the whole project. It also doesn't allow adding
// multiple packages, so for each one, everything has to be bootstrapped again.
//
// https://github.com/lerna/lerna/issues/2988
//
// This script fixes this by allowing to install multiple packges, and then run
// a more optimised bootstrap just for that package.
//
// Usage, for example to add the "uuid" and "@types/uuid" packages to the server
// sub-package:
//
// npm run i -- uuid @types/uuid @joplin/server

const { chdir } = require('process');
const { execCommand2, rootDir } = require('./tool-utils');

function dirnameFromPackageName(n) {
	if (!n.includes('/')) return n;
	const s = n.split('/');
	return s.pop();
}

async function main() {
	const argv = require('yargs').argv;
	const toInstallPackages = argv._;
	const targetPackageName = toInstallPackages.pop();
	const targetPackageDir = `${rootDir}/packages/${dirnameFromPackageName(targetPackageName)}`;

	chdir(targetPackageDir);
	await execCommand2(`npm install ${toInstallPackages.join(' ')}`);

	chdir(rootDir);
	await execCommand2(`npx lerna bootstrap --include-dependents --include-dependencies --scope=${targetPackageName}`);
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
