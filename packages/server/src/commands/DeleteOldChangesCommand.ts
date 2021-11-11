import { Options } from 'yargs';
import { Day } from '../utils/time';
import BaseCommand, { RunContext } from './BaseCommand';

interface Argv {
	ttl: number;
}

export default class DeleteOldChangesCommand extends BaseCommand {

	public command() {
		return 'delete-old-changes';
	}

	public description() {
		return 'deletes old changes';
	}

	public options(): Record<string, Options> {
		return {
			'ttl': {
				type: 'number',
				description: 'TTL in days',
			},
		};
	}

	public async run(argv: Argv, runContext: RunContext): Promise<void> {
		await runContext.models.change().deleteOldChanges(argv.ttl ? argv.ttl * Day : null);
	}

}
