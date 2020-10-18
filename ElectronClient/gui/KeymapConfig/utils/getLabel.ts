import CommandService from 'lib/services/CommandService';
import shim from 'lib/shim';

import { _ } from 'lib/locale';

const commandService = CommandService.instance();

const getLabel = (commandName: string) => {
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
	default:
		throw new Error(`Command: ${commandName} is unknown`);
	}
};

export default getLabel;
