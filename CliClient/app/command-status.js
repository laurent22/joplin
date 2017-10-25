import { BaseCommand } from './base-command.js';
import { Database } from 'lib/database.js';
import { app } from './app.js';
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
		let report = await service.status(Setting.value('sync.target'));

		for (let i = 0; i < report.length; i++) {
			let section = report[i];

			if (i > 0) this.stdout('');

			this.stdout('# ' + section.title);
			this.stdout('');

			for (let n in section.body) {
				if (!section.body.hasOwnProperty(n)) continue;
				let line = section.body[n];
				this.stdout(line);
			}
		}

		app().gui().showConsole();
		app().gui().maximizeConsole();
	}

}

module.exports = Command;