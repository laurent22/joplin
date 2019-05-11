const BaseService = require('lib/services/BaseService');
const Migration = require('lib/models/Migration');

class MigrationService extends BaseService {

	constructor() {
		super();

	}

	static instance() {
		if (this.instance_) return this.instance_;
		this.instance_ = new MigrationService();
		return this.instance_;
	}

	async run() {
		const migrations = await Migration.migrationsToDo();

		for (const migration of migrations) {
			this.logger().info('Running migration: ' + migration.number);

			const script = Migration.script(migration.number);

			try {
				await script.exec();
				await Migration.delete(migration.id);
			} catch (error) {
				this.logger().error('Cannot run migration: ' + migration.number, error);
				break;
			}
		}
	}

}

module.exports = MigrationService;