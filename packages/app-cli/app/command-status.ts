import BaseCommand from './base-command';
import app from './app';
import Setting from '@joplin/lib/models/Setting';
import { _ } from '@joplin/lib/locale';
import ReportService from '@joplin/lib/services/ReportService';

class Command extends BaseCommand {
	public override usage() {
		return 'status';
	}

	public override description() {
		return _('Displays summary about the notes and notebooks.');
	}

	public override async action() {
		const service = new ReportService();
		const report = await service.status(Setting.value('sync.target'));

		for (let i = 0; i < report.length; i++) {
			const section = report[i];

			if (i > 0) this.stdout('');

			this.stdout(`# ${section.title}`);
			this.stdout('');

			let canRetryType = '';

			for (const n in section.body) {
				if (!section.body.hasOwnProperty(n)) continue;
				const item = section.body[n];

				if (typeof item === 'object') {
					canRetryType = item.canRetryType;
					this.stdout(item.text);
				} else {
					this.stdout(item);
				}
			}

			if (canRetryType === 'e2ee') {
				this.stdout('');
				this.stdout(_('To retry decryption of these items. Run `e2ee decrypt --retry-failed-items`'));
			}
		}

		app().gui().showConsole();
		app().gui().maximizeConsole();
	}
}

module.exports = Command;
