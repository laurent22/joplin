import Plugin from 'lib/services/plugins/Plugin';
import BasePluginRunner from 'lib/services/plugins/BasePluginRunner';
import Global from 'lib/services/plugins/api/Global';
import { EventHandlers } from 'lib/services/plugins/utils/mapEventHandlersToIds';
declare enum PluginMessageTarget {
    MainWindow = "mainWindow",
    Plugin = "plugin"
}
export interface PluginMessage {
    target: PluginMessageTarget;
    pluginId: string;
    callbackId?: string;
    path?: string;
    args?: any[];
    result?: any;
    error?: any;
}
export default class PluginRunner extends BasePluginRunner {
    protected eventHandlers_: EventHandlers;
    constructor();
    private eventHandler;
    run(plugin: Plugin, pluginApi: Global): Promise<void>;
}
export {};
