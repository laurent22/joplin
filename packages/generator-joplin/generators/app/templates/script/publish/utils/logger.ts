/* eslint-disable no-console */
import { green, yellow, red } from 'chalk';

const logger = {
	info: (msg: string) => console.log(msg),
	success: (msg: string) => console.log(green(msg)),
	warn: (msg: string) => console.log(yellow(msg)),
	error: (msg: string) => console.log(red(msg)),
};

export default logger;
