/* eslint-disable jest/require-top-level-describe */

module.exports = () => {
	// Disable the additional information that Jest adds to each console
	// statement. It's rarely needed and if it is it can be commented out here.

	const jestConsole = console;

	beforeEach(() => {
		global.console = require('console');
	});

	afterEach(() => {
		global.console = jestConsole;
	});
};
