import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { GotoAnythingUserData, Mode, UserDataCallbackReject, UserDataCallbackResolve } from '../../../plugins/GotoAnything';
import PluginManager from '@joplin/lib/services/PluginManager';

export enum UiType {
	GotoAnything = 'gotoAnything',
	CommandPalette = 'commandPalette',
	ControlledApi = 'controlledApi',
}

export interface GotoAnythingOptions {
	mode?: Mode;
}

export const declaration: CommandDeclaration = {
	name: 'gotoAnything',
	label: () => _('Goto Anything...'),
};

interface PluginMenuItem {
	id: string;
	click: ()=> void;
	userData?: GotoAnythingUserData;
}

function menuItemById(id: string): PluginMenuItem {
	return PluginManager.instance().menuItems().find((i: PluginMenuItem) => i.id === id);
}

// The way this command is implemented is a bit hacky due to the PluginManager
// layer. This manager is no longer needed but hasn't been refactored yet, so in
// the meantime we access the GotoAnything actions by grabbing the menu item
// calling the click() handler.
export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, uiType: UiType = UiType.GotoAnything, options: GotoAnythingOptions = null) => {
			options = {
				mode: Mode.Default,
				...options,
			};

			if (uiType === UiType.GotoAnything) {
				menuItemById('gotoAnything').click();
			} else if (uiType === UiType.CommandPalette) {
				menuItemById('commandPalette').click();
			} else if (uiType === UiType.ControlledApi) {
				return new Promise((resolve: UserDataCallbackResolve, reject: UserDataCallbackReject) => {
					const menuItem: PluginMenuItem = PluginManager.instance().menuItems().find((i: PluginMenuItem) => i.id === 'controlledApi');
					const userData: GotoAnythingUserData = {
						callback: { resolve, reject },
						mode: options.mode,
					};
					menuItem.userData = userData;
					menuItem.click();
				});
			}
			return null;
		},
	};
};
