import app from '../app';
import Folder from '@joplin/lib/models/Folder';
import BaseCommand from '../base-command';
import setupCommand from '../setupCommand';

// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any -- Old code before rule was applied, Old code before rule was applied
export const setupCommandForTesting = (CommandClass: any, stdout: Function = null): BaseCommand => {
	const command = new CommandClass();
	setupCommand(command, stdout, null, null);
	return command;
};

export const setupApplication = async () => {
	// We create a notebook and set it as default since most commands require
	// such notebook.
	await Folder.save({ title: 'default' });
	await app().refreshCurrentFolder();
};
