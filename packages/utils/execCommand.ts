import * as execa from 'execa';
import commandToString from './commandToString';
import splitCommandString from './splitCommandString';
import { stdout } from 'process';

interface ExecCommandOptions {
	showInput?: boolean;
	showStdout?: boolean;
	showStderr?: boolean;
	quiet?: boolean;
}

export default async (command: string | string[], options: ExecCommandOptions | null = null): Promise<string> => {
	options = {
		showInput: true,
		showStdout: true,
		showStderr: true,
		quiet: false,
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
	const promise = execa(executableName, args);
	if (options.showStdout && promise.stdout) promise.stdout.pipe(process.stdout);
	if (options.showStderr && promise.stderr) promise.stderr.pipe(process.stderr);
	const result = await promise;
	return result.stdout.trim();
};
