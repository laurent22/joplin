import Plugin from './Plugin';
import BaseService from '../BaseService';
import Global from './api/Global';
export default abstract class BasePluginRunner extends BaseService {
    run(plugin: Plugin, sandbox: Global): Promise<void>;
}
