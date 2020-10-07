import { CreateMenuItemOptions, MenuItemLocation } from './types';
import MenuItemController from '../MenuItemController';
import Plugin from '../Plugin';
export default class JoplinViewsMenuItems {
    private store;
    private plugin;
    constructor(plugin: Plugin, store: any);
    create(commandName: string, location?: MenuItemLocation, options?: CreateMenuItemOptions): Promise<MenuItemController>;
}
