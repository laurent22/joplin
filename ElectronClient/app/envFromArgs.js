// Flags are parsed properly in BaseApplication, however it's better to have
// the env as early as possible to enable debugging capabilities.
function envFromArgs(args) {
	if (!args) return 'prod';
	const envIndex = args.indexOf('--env');
	const devIndex = args.indexOf('dev');
	if (envIndex === devIndex - 1) return 'dev';
	return 'prod';
}

module.exports = envFromArgs;
