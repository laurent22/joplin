import BaseCommand from './base-command';
import { _ } from '@joplin/lib/locale';
import versionInfo from '@joplin/lib/versionInfo';
import { pathExists } from 'fs-extra';
import { readFile } from 'fs/promises';
import { join } from 'path';

// The package.json file is stored in a different locations depending on whether
// the CLI app is published to NPM.
const loadPackageJson = async () => {
	const packageJsonPaths = ['./package.json', '../package.json'];
	for (const path of packageJsonPaths) {
		const fullPath = join(__dirname, path);
		if (await pathExists(fullPath)) {
			return JSON.parse(
				await readFile(fullPath, 'utf-8'),
			);
		}
	}
	throw new Error('Unable to find package.json');
};

class Command extends BaseCommand {
	public override usage() {
		return 'version';
	}

	public override description() {
		return _('Displays version information');
	}

	public override async action() {
		this.stdout(
			versionInfo(await loadPackageJson(), {}).message,
		);
	}
}

module.exports = Command;
