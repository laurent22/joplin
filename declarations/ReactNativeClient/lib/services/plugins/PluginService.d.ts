import Plugin from 'lib/services/plugins/Plugin';
import BasePluginRunner from 'lib/services/plugins/BasePluginRunner';
import BaseService from '../BaseService';
interface Plugins {
    [key: string]: Plugin;
}
export default class PluginService extends BaseService {
    private static instance_;
    static instance(): PluginService;
    private store_;
    private platformImplementation_;
    private plugins_;
    private runner_;
    initialize(platformImplementation: any, runner: BasePluginRunner, store: any): void;
    get plugins(): Plugins;
    pluginById(id: string): Plugin;
    loadPlugin(path: string): Promise<Plugin>;
    loadAndRunPlugins(pluginDirOrPaths: string | string[]): Promise<void>;
    runPlugin(plugin: Plugin): Promise<void>;
}
export {};
