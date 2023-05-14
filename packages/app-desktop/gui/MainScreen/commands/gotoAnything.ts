import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
const PluginManager = require('@joplin/lib/services/PluginManager');

export enum UiType {
	GotoAnything = 'gotoAnything',
	CommandPalette = 'commandPalette',
	ControlledApi = 'controlledApi',
}

export const declaration: CommandDeclaration = {
	name: 'gotoAnything',
	label: () => _('Goto Anything...'),
};

function menuItemById(id: string) {
	return PluginManager.instance().menuItems().find((i: any) => i.id === id);
}

// The way this command is implemented is a bit hacky due to the PluginManager
// layer. This manager is no longer needed but hasn't been refactored yet, so in
// the meantime we access the GotoAnything actions by grabbing the menu item
// calling the click() handler.
export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, uiType: UiType = UiType.GotoAnything) => {
			if (uiType === UiType.GotoAnything) {
				menuItemById('gotoAnything').click();
			} else if (uiType === UiType.CommandPalette) {
				const originalMenuItem = menuItemById('commandPalette');
				const originalClickHandler = originalMenuItem.click;

				// Replace the original click handler with a new one that preserves the original case
				originalMenuItem.click = function() {
					const originalRenderFunction = this.menu.render;
					this.menu.render = function() {
						const result = originalRenderFunction.apply(this, arguments);

						// Preserve the original case of note titles
						const search = result.querySelector('#search');
						const resultsList = result.querySelector('#results-list');
						if (search && resultsList) {
							const searchValue = search.value.toLowerCase();
							resultsList.querySelectorAll('li > a').forEach(link => {
								link.textContent = link.title.replace(new RegExp(searchValue, 'ig'), (match) => {
									const index = match.toLowerCase().indexOf(searchValue);
									return match.slice(0, index) + match.slice(index, index + searchValue.length).toUpperCase() + match.slice(index + searchValue.length);
								});
							});
						}

						return result;
					};

					originalClickHandler.apply(this, arguments);
				};

				originalMenuItem.click();
			} else if (uiType === UiType.ControlledApi) {
				return new Promise((resolve: Function, reject: Function) => {
					const menuItem = PluginManager.instance().menuItems().find((i: any) => i.id === 'controlledApi');
					menuItem.userData = {
						callback: { resolve, reject },
					};
					menuItem.click();
				});
			}
		},
	};

};
