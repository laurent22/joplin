import * as execa from 'execa';
import commandToString from './commandToString';
import splitCommandString from './splitCommandString';
import { stdout } from 'process';

interface ExecCommandOptions {
	showInput?: boolean;
	showStdout?: boolean;
	showStderr?: boolean;
	quiet?: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	env?: Record<string, any>;
	detached?: boolean;
}

export default async (command: string | string[], options: ExecCommandOptions | null = null): Promise<string> => {
	const detached = options ? options.detached : false;

	// When launching a detached executable it's better not to pipe the stdout and stderr, as this
	// will most likely cause an EPIPE error.

	options = {
		showInput: !detached,
		showStdout: !detached,
		showStderr: !detached,
		quiet: false,
		env: {},
		...options,
	};

	if (options.quiet) {
		options.showInput = false;
		options.showStdout = false;
		options.showStderr = false;
	}

	if (options.showInput) {
		if (typeof command === 'string') {
			stdout.write(`> ${command}\n`);
		} else {
			stdout.write(`> ${commandToString(command[0], command.slice(1))}\n`);
		}
	}

	const args: string[] = typeof command === 'string' ? splitCommandString(command) : command as string[];
	const executableName = args[0];
	args.splice(0, 1);
	const promise = execa(executableName, args, { env: options.env, detached: options.detached });
	if (options.showStdout && promise.stdout) promise.stdout.pipe(process.stdout);
	if (options.showStderr && promise.stderr) promise.stderr.pipe(process.stderr);
	const result = await promise;
	return result.stdout.trim();
};
