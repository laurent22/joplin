import MenuItemController, { MenuItemLocation } from '../MenuItemController';
import Plugin from '../Plugin';
interface CreateMenuItemOptions {
    accelerator: string;
}
export default class JoplinViewsMenuItems {
    private store;
    private plugin;
    constructor(plugin: Plugin, store: any);
    create(commandName: string, location?: MenuItemLocation, options?: CreateMenuItemOptions): Promise<MenuItemController>;
}
export {};
