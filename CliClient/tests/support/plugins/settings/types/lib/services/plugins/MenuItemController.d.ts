import ViewController from './ViewController';
export declare enum MenuItemLocation {
    File = "file",
    Edit = "edit",
    View = "view",
    Note = "note",
    Tools = "tools",
    Help = "help",
    Context = "context"
}
export default class MenuItemController extends ViewController {
    constructor(id: string, pluginId: string, store: any, commandName: string, location: MenuItemLocation);
    get type(): string;
}
