const readline = require('readline/promises');

/* eslint-disable no-console */

export const isTTY = () => process.stdin.isTTY;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
let readlineInterface: any = null;
export const waitForCliInput = async () => {
	readlineInterface ??= readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	if (isTTY()) {
		const green = '\x1b[92m';
		const reset = '\x1b[0m';
		await readlineInterface.question(`${green}[Press enter to continue]${reset}`);

		console.log('Continuing...');
	} else {
		console.warn('Input is not from a TTY -- not waiting for input.');
	}
};

