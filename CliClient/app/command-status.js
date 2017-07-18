import { BaseCommand } from './base-command.js';
import { Database } from 'lib/database.js';
import { Setting } from 'lib/models/setting.js';
import { _ } from 'lib/locale.js';
import { ReportService } from 'lib/services/report.js';

class Command extends BaseCommand {

	usage() {
		return 'status';
	}

	description() {
		return _('Displays summary about the notes and notebooks.');
	}

	async action(args) {
		let service = new ReportService();
		let report = await service.status(Database.enumId('syncTarget', Setting.value('sync.target')));

		for (let i = 0; i < report.length; i++) {
			let section = report[i];

			if (i > 0) this.log('');

			this.log('# ' + section.title);
			this.log('');

			for (let n in section.body) {
				if (!section.body.hasOwnProperty(n)) continue;
				let line = section.body[n];
				this.log(line);
			}
		}
	}

}

module.exports = Command;