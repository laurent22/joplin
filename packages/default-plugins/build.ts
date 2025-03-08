import buildAll from './commands/buildAll';
import editPatch from './commands/editPatch';
const yargs = require('yargs');


const build = () => {
	// eslint-disable-next-line no-unused-expressions -- Old code before rule was applied
	yargs
		.usage('$0 <cmd> [args]')
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		.command('build <outputDir>', 'build all', (yargs: any) => {
			yargs.positional('outputDir', {
				type: 'string',
				describe: 'Path to the parent directory for built output',
			});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		}, async (args: any) => {
			await buildAll(args.outputDir);
			process.exit(0);
		})
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		.command('patch-plugin <plugin>', 'Edit the patch file for the given plugin ID', (yargs: any) => {
			yargs.positional('plugin', {
				type: 'string',
				describe: 'ID of the plugin to patch',
			});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		}, async (args: any) => {
			await editPatch(args.plugin, null);
			process.exit(0);
		})
		.help()
		.argv;
};

build();
