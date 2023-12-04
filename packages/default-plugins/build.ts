import buildAll from './commands/buildAll';
import editPatch from './commands/editPatch';
const yargs = require('yargs');


const build = () => {
	yargs
		.usage('$0 <cmd> [args]')
		.command('build <outputDir>', 'build all', (yargs: any) => {
			yargs.positional('outputDir', {
				type: 'string',
				describe: 'Path to the parent directory for built output',
			});
		}, async (args: any) => {
			await buildAll(args.outputDir);
			process.exit(0);
		})
		.command('patch <plugin> <outputDir>', 'build all, but stop for patching', (yargs: any) => {
			yargs.positional('plugin', {
				type: 'string',
				describe: 'ID of the plugin to patch',
			});
			yargs.positional('outputDir', {
				type: 'string',
				describe: 'Name of the plugin to patch',
			});
		}, async (args: any) => {
			await editPatch(args.plugin, args.outputDir);
			process.exit(0);
		})
		.help()
		.argv;
};

build();
