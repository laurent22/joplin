'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const CommandService_1 = require('../../../lib/services/CommandService');
const { _ } = require('lib/locale');
const { shim } = require('lib/shim');
const commandService = CommandService_1.default.instance();
const getLabel = (commandName) => {
	if (commandService.exists(commandName)) { return commandService.label(commandName); }
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
	case 'config':
		return shim.isMac() ? _('Preferences') : _('Options');
	default:
		throw new Error(`Command: ${commandName} is unknown`);
	}
};
exports.default = getLabel;
// # sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0TGFiZWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXRMYWJlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHlFQUFrRTtBQUVsRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ3BDLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFFckMsTUFBTSxjQUFjLEdBQUcsd0JBQWMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUVqRCxNQUFNLFFBQVEsR0FBRyxDQUFDLFdBQW1CLEVBQUUsRUFBRTtJQUN4QyxJQUFJLGNBQWMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDO1FBQUUsT0FBTyxjQUFjLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBRWpGLG1FQUFtRTtJQUNuRSx1REFBdUQ7SUFFdkQsUUFBUSxXQUFXLEVBQUU7UUFDckIsS0FBSyxNQUFNO1lBQ1YsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbEIsS0FBSyxnQkFBZ0I7WUFDcEIsT0FBTyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUM3QixLQUFLLGdCQUFnQjtZQUNwQixPQUFPLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUN6QixLQUFLLGNBQWM7WUFDbEIsT0FBTyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUM5QixLQUFLLE1BQU07WUFDVixPQUFPLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBQ3ZDLEtBQUssU0FBUztZQUNiLE9BQU8sQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3pCLEtBQUssYUFBYTtZQUNqQixPQUFPLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUMxQixLQUFLLFFBQVE7WUFDWixPQUFPLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdkQ7WUFDQyxNQUFNLElBQUksS0FBSyxDQUFDLFlBQVksV0FBVyxhQUFhLENBQUMsQ0FBQztLQUN0RDtBQUNGLENBQUMsQ0FBQztBQUVGLGtCQUFlLFFBQVEsQ0FBQyJ9
