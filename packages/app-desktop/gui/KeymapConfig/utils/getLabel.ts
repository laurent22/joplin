import CommandService from '@joplinapp/lib/services/CommandService';
import shim from '@joplinapp/lib/shim';

import { _ } from '@joplinapp/lib/locale';

const commandService = CommandService.instance();

const getLabel = (commandName: string):string => {
	if (commandService.exists(commandName)) return commandService.label(commandName, true);

	// Some commands are not registered in CommandService at the moment
	// Following hard-coded labels are used as a workaround

	switch (commandName) {
	case 'quit':
		return _('Quit');
	case 'insertTemplate':
		return _('Insert template');
	case 'zoomActualSize':
		return _('Actual Size');
	case 'gotoAnything':
		return _('Goto Anything...');
	case 'help':
		return _('Website and documentation');
	case 'hideApp':
		return _('Hide Joplin');
	case 'closeWindow':
		return _('Close Window');
	case 'commandPalette':
		return _('Command palette');
	case 'config':
		return shim.isMac() ? _('Preferences') : _('Options');
	}

	// We don't throw an error if a command is not found because if for
	// example a command is removed from one version to the next, or a
	// command is renamed, we still want the keymap editor to work. So in
	// that case, we simply display the command name and it is up to the
	// user to fix the shortcut if needed.
	return `${commandName} (${_('Invalid')})`;
};

export default getLabel;
