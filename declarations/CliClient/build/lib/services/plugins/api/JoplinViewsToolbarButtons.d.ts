import Plugin from '../Plugin';
import ToolbarButtonController, { ToolbarButtonLocation } from '../ToolbarButtonController';
export default class JoplinViewsToolbarButtons {
    private store;
    private plugin;
    constructor(plugin: Plugin, store: any);
    create(commandName: string, location: ToolbarButtonLocation): Promise<ToolbarButtonController>;
}
