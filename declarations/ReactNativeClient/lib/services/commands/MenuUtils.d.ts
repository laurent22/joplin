import CommandService from '../CommandService';
interface MenuItem {
    id: string;
    label: string;
    click: Function;
    role?: any;
    accelerator?: string;
}
interface MenuItems {
    [key: string]: MenuItem;
}
interface MenuItemProps {
    [key: string]: any;
}
export default class MenuUtils {
    private service_;
    private menuItemCache_;
    private menuItemPropsCache_;
    constructor(service: CommandService);
    private get service();
    private get keymapService();
    private commandToMenuItem;
    commandToStatefulMenuItem(commandName: string, props?: any): MenuItem;
    commandsToMenuItems(commandNames: string[], onClick: Function): MenuItems;
    commandsToMenuItemProps(state: any, commandNames: string[]): MenuItemProps;
}
export {};
