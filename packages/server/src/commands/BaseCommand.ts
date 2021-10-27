import { Options, PositionalOptions } from 'yargs';
import { DbConnection } from '../db';
import { Models } from '../models/factory';

export interface RunContext {
	db: DbConnection;
	models: Models;
}

export default abstract class BaseCommand {

	public commandName(): string {
		const splitted = this.command().split(' ');
		if (!splitted.length) throw new Error(`Invalid command: ${this.command()}`);
		return splitted[0];
	}

	public command(): string {
		throw new Error('Not implemented');
	}

	public description(): string {
		throw new Error('Not implemented');
	}

	public positionals(): Record<string, PositionalOptions> {
		return {};
	}

	public options(): Record<string, Options> {
		return {};
	}

	public abstract run(argv: any, context: RunContext): Promise<void>;

}
