import { _ } from '@joplin/lib/locale';
import time from '@joplin/lib/time';
import Logger, { TargetType } from '@joplin/utils/Logger';
import * as readline from 'readline';
import { Writable } from 'stream';
import BaseCommand from './base-command';
import yargParser = require('yargs-parser');
const stringPadding = require('string-padding');

interface ParsedCommandArg {
	required: boolean;
	name: string;
}

interface ParsedFlags {
	long?: string;
	short?: string;
	arg?: ParsedCommandArg;
}

interface PromptOptions {
	secure?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- command args carry a mixed bag of values per the command-specific argv shapes
type CommandArgs = Record<string, any>;

interface CliUtils {
	stdout_?: (s: string)=> void;
	printArray(logFunction: (s: string)=> void, rows: unknown[][]): void;
	parseFlags(flags: string): ParsedFlags;
	parseCommandArg(arg: string): ParsedCommandArg;
	makeCommandArgs(cmd: BaseCommand, argv: string[]): CommandArgs;
	promptMcq(message: string, answers: Record<string, string>): Promise<string>;
	promptConfirm(message: string, answers?: string[] | null): Promise<boolean>;
	prompt(initialText?: string, promptString?: string, options?: PromptOptions | null): Promise<string>;
	setStdout(v: (s: string)=> void): void;
	redraw(s: string): void;
	redrawDone(): void;
	stdoutLogger(stdout: (s: string)=> void): Logger;
}

// eslint-disable-next-line import/prefer-default-export -- file is named after its functional area (cli-utils); the only export is the cliUtils namespace object
export const cliUtils: CliUtils = {} as CliUtils;

cliUtils.printArray = function(logFunction: (s: string)=> void, rows: unknown[][]) {
	const ALIGN_LEFT = 0;
	const ALIGN_RIGHT = 1;

	const colWidths: number[] = [];
	const colAligns: number[] = [];

	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];

		for (let j = 0; j < row.length; j++) {
			const item = row[j];
			const width = item ? item.toString().length : 0;
			const align = typeof item === 'number' ? ALIGN_RIGHT : ALIGN_LEFT;
			if (!colWidths[j] || colWidths[j] < width) colWidths[j] = width;
			if (colAligns.length <= j) colAligns[j] = align;
		}
	}

	for (let row = 0; row < rows.length; row++) {
		const line: string[] = [];
		for (let col = 0; col < colWidths.length; col++) {
			const item = rows[row][col];
			const isLastCol = col === colWidths.length - 1;
			if (isLastCol) {
				line.push(item ? item.toString() : '');
			} else {
				const width = colWidths[col];
				const dir = colAligns[col] === ALIGN_LEFT ? stringPadding.RIGHT : stringPadding.LEFT;
				line.push(stringPadding(item, width, ' ', dir));
			}
		}
		logFunction(line.join(' '));
	}
};

cliUtils.parseFlags = function(flags: string): ParsedFlags {
	const output: ParsedFlags = {};
	const parts = flags.split(',');
	for (let i = 0; i < parts.length; i++) {
		const f = parts[i].trim();

		if (f.substr(0, 2) === '--') {
			const fParts = f.split(' ');
			output.long = fParts[0].substr(2).trim();
			if (fParts.length === 2) {
				output.arg = cliUtils.parseCommandArg(fParts[1].trim());
			}
		} else if (f.substr(0, 1) === '-') {
			output.short = f.substr(1);
		}
	}
	return output;
};

cliUtils.parseCommandArg = function(arg: string): ParsedCommandArg {
	if (arg.length <= 2) throw new Error(`Invalid command arg: ${arg}`);

	const c1 = arg[0];
	const c2 = arg[arg.length - 1];
	const name = arg.substr(1, arg.length - 2);

	if (c1 === '<' && c2 === '>') {
		return { required: true, name: name };
	} else if (c1 === '[' && c2 === ']') {
		return { required: false, name: name };
	} else {
		throw new Error(`Invalid command arg: ${arg}`);
	}
};

cliUtils.makeCommandArgs = function(cmd: BaseCommand, argv: string[]): CommandArgs {
	const cmdUsage = cmd.usage();
	const parsedUsage = yargParser(cmdUsage);
	const output: CommandArgs = {};

	const options = cmd.options() as [string, string][];
	const booleanFlags: string[] = [];
	const aliases: Record<string, string[]> = {};
	const flagSpecs: ParsedFlags[] = [];
	for (let i = 0; i < options.length; i++) {
		if (options[i].length !== 2) throw new Error(`Invalid options: ${options[i]}`);
		const flags = cliUtils.parseFlags(options[i][0]);

		if (!flags.arg) {
			if (flags.short) booleanFlags.push(flags.short);
			if (flags.long) booleanFlags.push(flags.long);
		}

		if (flags.short && flags.long) {
			aliases[flags.long] = [flags.short];
		}

		flagSpecs.push(flags);
	}

	const args = yargParser(argv, {
		boolean: booleanFlags,
		alias: aliases,
		string: ['_'],
	});

	for (let i = 1; i < parsedUsage['_'].length; i++) {
		const a = cliUtils.parseCommandArg(parsedUsage['_'][i] as string);
		if (a.required && !args['_'][i]) throw new Error(_('Missing required argument: %s', a.name));
		output[a.name] = args['_'][i];
	}

	const argOptions: CommandArgs = {};
	for (const key in args) {
		if (!args.hasOwnProperty(key)) continue;
		if (key === '_') continue;
		argOptions[key] = args[key];
	}

	for (const [key, value] of Object.entries(argOptions)) {
		const flagSpec = flagSpecs.find(s => {
			return s.short === key || s.long === key;
		});
		if (flagSpec?.arg?.required) {
			// If a flag is required, and no value is provided for it, Yargs
			// sets the value to `true`.
			if (value === true) {
				throw new Error(_('Missing required flag value: %s', `-${flagSpec.short} <${flagSpec.arg.name}>`));
			}
		}
	}

	output.options = argOptions;

	return output;
};

cliUtils.promptMcq = function(message: string, answers: Record<string, string>): Promise<string> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	message += '\n\n';
	for (const n in answers) {
		if (!answers.hasOwnProperty(n)) continue;
		message += `${_('%s: %s', n, answers[n])}\n`;
	}

	message += '\n';
	message += _('Your choice: ');

	return new Promise((resolve, reject) => {
		rl.question(message, answer => {
			rl.close();

			if (!(answer in answers)) {
				reject(new Error(_('Invalid answer: %s', answer)));
				return;
			}

			resolve(answer);
		});
	});
};

cliUtils.promptConfirm = function(message: string, answers: string[] | null = null): Promise<boolean> {
	if (!answers) answers = [_('Y'), _('n')];

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	message += ` (${answers.join('/')})`;

	return new Promise((resolve) => {
		rl.question(`${message} `, answer => {
			const ok = !answer || answer.toLowerCase() === answers[0].toLowerCase();
			rl.close();
			resolve(ok);
		});
	});
};

// _initialText is there only to match statusBar.prompt's signature for drop-in
// use; readline.question doesn't expose a way to pre-fill the prompt.
cliUtils.prompt = function(_initialText = '', promptString = ':', options: PromptOptions | null = null): Promise<string> {
	if (!options) options = {};

	type MutableStdout = Writable & { muted: boolean };

	const mutableStdout = new Writable({
		write: function(this: MutableStdout, chunk, encoding, callback) {
			if (!this.muted) process.stdout.write(chunk, encoding);
			callback();
		},
	}) as MutableStdout;

	const rl = readline.createInterface({
		input: process.stdin,
		output: mutableStdout,
		terminal: true,
	});

	return new Promise((resolve) => {
		mutableStdout.muted = false;

		rl.question(promptString, answer => {
			rl.close();
			if (options.secure) cliUtils.stdout_('');
			resolve(answer);
		});

		mutableStdout.muted = !!options.secure;
	});
};

let redrawStarted_ = false;
let redrawLastLog_: string | null = null;
let redrawLastUpdateTime_ = 0;

cliUtils.setStdout = function(v: (s: string)=> void) {
	this.stdout_ = v;
};

cliUtils.redraw = function(s: string) {
	const now = time.unixMs();

	if (now - redrawLastUpdateTime_ > 4000) {
		this.stdout_(s);
		redrawLastUpdateTime_ = now;
		redrawLastLog_ = null;
	} else {
		redrawLastLog_ = s;
	}

	redrawStarted_ = true;
};

cliUtils.redrawDone = function() {
	if (!redrawStarted_) return;

	if (redrawLastLog_) {
		this.stdout_(redrawLastLog_);
	}

	redrawLastLog_ = null;
	redrawStarted_ = false;
};

cliUtils.stdoutLogger = function(stdout: (s: string)=> void): Logger {
	const stdoutFn = (...s: string[]) => stdout(s.join(' '));

	const logger = new Logger();
	logger.addTarget(TargetType.Console, { console: {
		info: stdoutFn,
		warn: stdoutFn,
		error: stdoutFn,
	} as unknown as Console });

	return logger;
};
