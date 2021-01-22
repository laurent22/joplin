import BaseService from './BaseService';
import Migration from '../models/Migration';

export default class MigrationService extends BaseService {

	private static instance_: MigrationService;

	static instance() {
		if (this.instance_) return this.instance_;
		this.instance_ = new MigrationService();
		return this.instance_;
	}

	async runScript(num: number) {
		const script = Migration.script(num);
		await script.exec();
	}

	async run() {
		const migrations = await Migration.migrationsToDo();

		for (const migration of migrations) {
			this.logger().info(`Running migration: ${migration.number}`);

			try {
				await this.runScript(migration.number);
				await Migration.delete(migration.id);
			} catch (error) {
				this.logger().error(`Cannot run migration: ${migration.number}`, error);
				break;
			}
		}
	}
}
