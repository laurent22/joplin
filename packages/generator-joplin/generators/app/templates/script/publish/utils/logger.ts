/* eslint-disable no-console */
import { green, yellow, red, cyan, blue, gray } from 'chalk';

const logger = {
	info: (msg: string) => console.log(msg),
	success: (msg: string) => console.log(green(msg)),
	warn: (msg: string) => console.log(yellow(msg)),
	error: (msg: string) => console.log(red(msg)),

	// UI Elements for the CLI
	header: (msg: string) => console.log(cyan.bold(`\n ${msg}\n`)),
	step: (msg: string) => console.log(blue.bold(msg)),
	divider: () => console.log(gray('\n--------------------------------------------------')),
};

export default logger;
