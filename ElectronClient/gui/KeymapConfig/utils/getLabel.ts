import CommandService from '../../../lib/services/CommandService';

const { _ } = require('lib/locale.js');
const { shim } = require('lib/shim.js');

const getLabel = (commandName: string) => {
	try {
		return CommandService.instance().label(commandName);
	} catch (err) {
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
		case 'config':
			return shim.isMac() ? _('Preferences') : _('Options');
		default:
			throw err;
		}
	}
};

export default getLabel;
