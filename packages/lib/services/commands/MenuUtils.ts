import { MenuItemLocation } from '../plugins/api/types';
import CommandService from '../CommandService';
import KeymapService from '../KeymapService';
import { PluginStates, utils as pluginUtils } from '../plugins/reducer';
import propsHaveChanged from './propsHaveChanged';
const { createSelectorCreator, defaultMemoize } = require('reselect');
const { createCachedSelector } = require('re-reselect');

export interface MenuItem {
	id?: string;
	label?: string;
	click?: Function;
	role?: any;
	type?: string;
	accelerator?: string;
	checked?: boolean;
	enabled?: boolean;
}

interface MenuItems {
	[key: string]: MenuItem;
}

interface MenuItemProps {
	[key: string]: any;
}

interface MenuItemPropsCache {
	[key: string]: any;
}

interface MenuItemCache {
	[key: string]: MenuItems;
}

const createShallowObjectEqualSelector = createSelectorCreator(
	defaultMemoize,
	(prev: any, next: any) => {
		if (Object.keys(prev).length !== Object.keys(next).length) return false;
		for (const n in prev) {
			if (prev[n] !== next[n]) return false;
		}
		return true;
	}
);

// This selector ensures that for the given command names, the same toolbar
// button array is returned if the underlying toolbar buttons have not changed.
const selectObjectByCommands = createCachedSelector(
	(state: any) => state.array,
	(array: any[]) => array
)({
	keySelector: (_state: any, commandNames: string[]) => {
		return commandNames.join('_');
	},
	selectorCreator: createShallowObjectEqualSelector,
});

export default class MenuUtils {

	private service_: CommandService;
	private menuItemCache_: MenuItemCache = {};
	private menuItemPropsCache_: MenuItemPropsCache = {};

	public constructor(service: CommandService) {
		this.service_ = service;
	}

	private get service(): CommandService {
		return this.service_;
	}

	private get keymapService(): KeymapService {
		return KeymapService.instance();
	}

	public commandToMenuItem(commandName: string, onClick: Function): MenuItem {
		const command = this.service.commandByName(commandName);

		const item: MenuItem = {
			id: command.declaration.name,
			label: this.service.label(commandName),
			click: () => onClick(command.declaration.name),
			enabled: true,
		};

		if (command.declaration.role) item.role = command.declaration.role;

		if (this.keymapService && this.keymapService.acceleratorExists(commandName)) {
			item.accelerator = this.keymapService.getAccelerator(commandName);
		}

		return item;
	}

	public commandToStatefulMenuItem(commandName: string, ...args: any[]): MenuItem {
		return this.commandToMenuItem(commandName, () => {
			return this.service.execute(commandName, ...args);
		});
	}

	public commandsToMenuItems(commandNames: string[], onClick: Function, locale: string): MenuItems {
		const key = `${this.keymapService.lastSaveTime}_${commandNames.join('_')}_${locale}`;
		if (this.menuItemCache_[key]) return this.menuItemCache_[key];

		const output: MenuItems = {};

		for (const commandName of commandNames) {
			output[commandName] = this.commandToMenuItem(commandName, onClick);
		}

		this.menuItemCache_ = {
			[key]: output,
		};

		return output;
	}

	public commandsToMenuItemProps(commandNames: string[], whenClauseContext: any): MenuItemProps {
		const output: MenuItemProps = {};

		for (const commandName of commandNames) {
			const newProps = {
				enabled: this.service.isEnabled(commandName, whenClauseContext),
			};

			if (newProps === null || propsHaveChanged(this.menuItemPropsCache_[commandName], newProps)) {
				output[commandName] = newProps;
				this.menuItemPropsCache_[commandName] = newProps;
			} else {
				output[commandName] = this.menuItemPropsCache_[commandName];
			}
		}

		return selectObjectByCommands({ array: output }, commandNames);
	}

	public pluginContextMenuItems(plugins: PluginStates, location: MenuItemLocation): MenuItem[] {
		const output: MenuItem[] = [];
		const pluginViewInfos = pluginUtils.viewInfosByType(plugins, 'menuItem');
		const whenClauseContext = this.service.currentWhenClauseContext();

		for (const info of pluginViewInfos) {
			if (info.view.location !== location) continue;
			const menuItem = this.commandToStatefulMenuItem(info.view.commandName);
			menuItem.enabled = this.service.isEnabled(info.view.commandName, whenClauseContext);
			output.push(menuItem);
		}

		if (output.length) output.splice(0, 0, { type: 'separator' } as any);

		return output;
	}

}
