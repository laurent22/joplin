import * as execa from 'execa';
import commandToString from './commandToString';
import splitCommandString from './splitCommandString';
import { stdout } from 'process';

interface ExecCommandOptions {
	showInput?: boolean;
	showStdout?: boolean;
	showStderr?: boolean;
	quiet?: boolean;
	env?: Record<string, string | undefined>;
	detached?: boolean;
	// Number of times to retry the command if it fails. 0 (the default) means no retry.
	retryCount?: number;
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
		retryCount: 0,
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

	const runOnce = async () => {
		const args: string[] = typeof command === 'string' ? splitCommandString(command) : [...command as string[]];
		const executableName = args[0];
		args.splice(0, 1);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Workaround for type definition conflicts. Expo currently overrides NodeJs.ProcessEnv, making NODE_ENV required. This changes the type of the "env" argument to execa.
		const promise = execa(executableName, args, { env: options.env as any });
		if (options.showStdout && promise.stdout) promise.stdout.pipe(process.stdout);
		if (options.showStderr && promise.stderr) promise.stderr.pipe(process.stderr);
		const result = await promise;
		return result.stdout.trim();
	};

	const maxAttempts = (options.retryCount ?? 0) + 1;
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await runOnce();
		} catch (error) {
			if (attempt === maxAttempts) throw error;
			stdout.write(`Command failed (attempt ${attempt}/${maxAttempts}): ${error}. Retrying...\n`);
			await new Promise(resolve => setTimeout(resolve, 5000 * attempt));
		}
	}

	// Unreachable: the loop above either returns or throws.
	throw new Error('execCommand: unreachable');
};
