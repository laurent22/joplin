import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
const PluginManager = require('@joplin/lib/services/PluginManager');

export const declaration: CommandDeclaration = {
	name: 'gotoAnything',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async () => {
			return new Promise((resolve: Function, reject: Function) => {
				const menuItem = PluginManager.instance().menuItems().find((i: any) => i.id === 'controlledApi');
				menuItem.userData = {
					callback: { resolve, reject },
				};
				menuItem.click();
			});
		},
	};
};
