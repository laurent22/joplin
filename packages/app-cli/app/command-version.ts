import BaseCommand from './base-command';
const { _ } = require('@joplin/lib/locale');
const versionInfo = require('@joplin/lib/versionInfo').default;

class Command extends BaseCommand {
	public override usage() {
		return 'version';
	}

	public override description() {
		return _('Displays version information');
	}

	public override async action() {
		this.stdout(versionInfo(require('./package.json'), {}).message);
	}
}

module.exports = Command;
