import BaseCommand from './base-command';
import app from './app';
import Setting from '@joplin/lib/models/Setting';
import ReportService from '@joplin/lib/services/ReportService';
import * as fs from 'fs-extra';

class Command extends BaseCommand {
	public override usage() {
		return 'export-sync-status';
	}

	public override description() {
		return 'Export sync status';
	}

	public override hidden() {
		return true;
	}

	public override async action() {
		const service = new ReportService();
		const csv = await service.basicItemList({ format: 'csv' }) as string;
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
