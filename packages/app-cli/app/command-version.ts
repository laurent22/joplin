
import package_6 from '../package.json';
import versionInfo from '@joplin/lib/versionInfo';
import BaseCommand from './base-command';
import { _ } from '@joplin/lib/locale';
class Command extends BaseCommand {
	public override usage() {
		return 'version';
	}

	public override description() {
		return _('Displays version information');
	}

	public override async action() {
		this.stdout(versionInfo(package_6, {}).message);
	}
}

module.exports = Command;
