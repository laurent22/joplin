import buildAll from './commands/buildAll';
import editPatch from './commands/editPatch';
import * as yargs from 'yargs';
import { Argv, ArgumentsCamelCase } from 'yargs';


const build = () => {
	// eslint-disable-next-line no-unused-expressions, @typescript-eslint/no-floating-promises -- Old code before rule was applied
	yargs
		.usage('$0 <cmd> [args]')
		.command('build <outputDir>', 'build all', (yargs: Argv) => {
			yargs.positional('outputDir', {
				type: 'string',
				describe: 'Path to the parent directory for built output',
			});
		}, async (args: ArgumentsCamelCase<{ outputDir: string }>) => {
			await buildAll(args.outputDir);
			process.exit(0);
		})
		.command('patch-plugin <plugin>', 'Edit the patch file for the given plugin ID', (yargs: Argv) => {
			yargs.positional('plugin', {
				type: 'string',
				describe: 'ID of the plugin to patch',
			});
		}, async (args: ArgumentsCamelCase<{ plugin: string }>) => {
			await editPatch(args.plugin, null);
			process.exit(0);
		})
		.help()
		.argv;
};

build();
