const { BaseCommand } = require('./base-command.js');
const { app } = require('./app.js');
const Setting = require('lib/models/Setting.js');
const { _ } = require('lib/locale.js');
const { ReportService } = require('lib/services/report.js');

class Command extends BaseCommand {
	usage() {
		return 'status';
	}

	description() {
		return _('Displays summary about the notes and notebooks.');
	}

	async action() {
		let service = new ReportService();
		let report = await service.status(Setting.value('sync.target'));

		for (let i = 0; i < report.length; i++) {
			let section = report[i];

			if (i > 0) this.stdout('');

			this.stdout(`# ${section.title}`);
			this.stdout('');

			for (let n in section.body) {
				if (!section.body.hasOwnProperty(n)) continue;
				let line = section.body[n];
				this.stdout(line);
			}
		}

		app()
			.gui()
			.showConsole();
		app()
			.gui()
			.maximizeConsole();
	}
}

module.exports = Command;
