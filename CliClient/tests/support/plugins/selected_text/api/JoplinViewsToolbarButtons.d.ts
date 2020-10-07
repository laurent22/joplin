import { ToolbarButtonLocation } from './types';
import Plugin from '../Plugin';
import ToolbarButtonController from '../ToolbarButtonController';
export default class JoplinViewsToolbarButtons {
    private store;
    private plugin;
    constructor(plugin: Plugin, store: any);
    create(commandName: string, location: ToolbarButtonLocation): Promise<ToolbarButtonController>;
}
