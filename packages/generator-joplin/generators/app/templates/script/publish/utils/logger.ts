/* eslint-disable no-console */
const chalk = require('chalk');

const logger = {
	info: (msg: string) => console.log(msg),
	success: (msg: string) => console.log(chalk.green(msg)),
	warn: (msg: string) => console.log(chalk.yellow(msg)),
	error: (msg: string) => console.log(chalk.red(msg)),
};

export default logger;
