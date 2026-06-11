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
		this.stdout(versionInfo(require('../package.json'), {}).message);
	}
}

module.exports = Command;
