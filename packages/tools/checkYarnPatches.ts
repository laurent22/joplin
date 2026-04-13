import { getRootDir } from '@joplin/utils';
import { readFile } from 'fs-extra';
import { join } from 'path';

// Checks that all patch resolutions in package.json are actually applied in
// yarn.lock. Catches the case where a dependency version is upgraded but the
// resolution still targets the old version, causing the patch to silently not
// apply.

const main = async () => {
	const rootDir = await getRootDir();
	const packageJson = JSON.parse(await readFile(join(rootDir, 'package.json'), 'utf8'));
	const yarnLock = await readFile(join(rootDir, 'yarn.lock'), 'utf8');

	const resolutions: Record<string, string> = packageJson.resolutions ?? {};
	const errors: string[] = [];

	for (const [key, value] of Object.entries(resolutions)) {
		if (!value.startsWith('patch:')) continue;

		// Extract the patch target, e.g. "patch:nanoid@npm%3A3.3.11#..." -> "nanoid@npm:3.3.11"
		const patchTarget = value
			.replace(/^patch:/, '')
			.replace(/#.*$/, '')
			.replace(/%3A/g, ':');

		// Extract package name and version from the patch target.
		// Supports both "pkg@npm:version" and "pkg@version" formats.
		const match = patchTarget.match(/^(.+)@(?:npm:)?(.+)$/);
		if (!match) {
			errors.push(
				`Invalid patch format for "${key}": "${patchTarget}" does not match ` +
				'expected pattern "packageName@npm:version" or "packageName@version".',
			);
			continue;
		}

		const [, packageName, patchVersion] = match;
		const hasNpmPrefix = patchTarget.includes('@npm:');

		// Check that yarn.lock contains a resolved entry for this exact
		// patch. The lockfile entry looks like:
		//   "pkg@patch:pkg@npm%3Aversion#path::..."  (with npm prefix)
		//   "pkg@patch:pkg@version#path::..."         (without npm prefix)
		const versionPart = hasNpmPrefix ? `@npm%3A${patchVersion}` : `@${patchVersion}`;
		const patchPattern = `"${packageName}@patch:${packageName}${versionPart}#`;
		if (!yarnLock.includes(patchPattern)) {
			errors.push(
				`Resolution "${key}" patches ${packageName}@${patchVersion}, ` +
				'but yarn.lock has no matching entry. The dependency was likely ' +
				'upgraded — update the patch to target the current version.',
			);
		}
	}

	if (errors.length > 0) {
		throw new Error(`Yarn patch validation failed:\n\n${errors.join('\n\n')}`);
	}

	console.log(`All ${Object.values(resolutions).filter(v => v.startsWith('patch:')).length} patch resolutions are applied.`);
};

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
