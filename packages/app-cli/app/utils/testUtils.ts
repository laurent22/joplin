import app from '../app';
import Folder from '@joplin/lib/models/Folder';
import BaseCommand from '../base-command';
import setupCommand from '../setupCommand';
import Setting from '@joplin/lib/models/Setting';

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

	// Some tests also need access to the Redux store
	app().initRedux();

	// Since the settings need to be loaded before the store is created, it will never
	// receive the SETTING_UPDATE_ALL event, which means state.settings will not be
	// initialised. So we manually call dispatchUpdateAll() to force an update.
	Setting.dispatchUpdateAll();
};
