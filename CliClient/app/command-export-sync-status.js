const { BaseCommand } = require('./base-command.js');
const { app } = require('./app.js');
const Setting = require('lib/models/Setting.js');
const { ReportService } = require('lib/services/report.js');
const fs = require('fs-extra');

class Command extends BaseCommand {
	usage() {
		return 'export-sync-status';
	}

	description() {
		return 'Export sync status';
	}

	hidden() {
		return true;
	}

	async action() {
		const service = new ReportService();
		const csv = await service.basicItemList({ format: 'csv' });
		const filePath = `${Setting.value('profileDir')}/syncReport-${new Date().getTime()}.csv`;
		await fs.writeFileSync(filePath, csv);
		this.stdout(`Sync status exported to ${filePath}`);

		app()
			.gui()
			.showConsole();
		app()
			.gui()
			.maximizeConsole();
	}
}

module.exports = Command;
