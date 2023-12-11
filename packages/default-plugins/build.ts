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
		.command('patch <plugin>', 'Edit the patch file for the given plugin ID', (yargs: any) => {
			yargs.positional('plugin', {
				type: 'string',
				describe: 'ID of the plugin to patch',
			});
		}, async (args: any) => {
			await editPatch(args.plugin, null);
			process.exit(0);
		})
		.help()
		.argv;
};

build();
