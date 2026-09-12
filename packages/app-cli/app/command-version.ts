import BaseCommand from './base-command';
import { _ } from '@joplin/lib/locale';
import versionInfo from '@joplin/lib/versionInfo';

class Command extends BaseCommand {
	public override usage() {
		return 'version';
	}

	public override description() {
		return _('Displays version information');
	}

	public override async action() {
		// The relative path to package.json is from the built version of this command
		// in app-cli/build/command-version.js (see https://github.com/laurent22/joplin/issues/15738):
		this.stdout(versionInfo(require('./package.json'), {}).message);
	}
}

module.exports = Command;
