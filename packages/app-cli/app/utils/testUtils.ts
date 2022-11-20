const { app } = require('../app');
import Folder from '@joplin/lib/models/Folder';
import BaseCommand from '../base-command';
import setupCommand from '../setupCommand';

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
