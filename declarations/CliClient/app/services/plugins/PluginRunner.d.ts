import Plugin from 'lib/services/plugins/Plugin';
import BasePluginRunner from 'lib/services/plugins/BasePluginRunner';
import Global from 'lib/services/plugins/api/Global';
export default class PluginRunner extends BasePluginRunner {
    private eventHandlers_;
    constructor();
    private eventHandler;
    private newSandboxProxy;
    run(plugin: Plugin, sandbox: Global): Promise<void>;
}
