import { Options } from 'yargs';
import { Day } from '../utils/time';
import BaseCommand, { RunContext } from './BaseCommand';

interface Argv {
	ttl: number;
}

export default class CompressOldChangesCommand extends BaseCommand {

	public command() {
		return 'compress-old-changes';
	}

	public description() {
		return 'compresses old changes by discarding consecutive updates';
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
		await runContext.models.change().compressOldChanges(argv.ttl ? argv.ttl * Day : null);
	}

}
