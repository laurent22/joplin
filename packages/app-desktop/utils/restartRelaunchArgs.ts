export default (argv: string[]) => {
	return argv.slice(1).filter(arg => arg !== '--relaunch');
};
