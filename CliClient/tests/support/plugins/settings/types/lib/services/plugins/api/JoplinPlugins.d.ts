import Plugin from '../Plugin';
import Logger from 'lib/Logger';
export default class JoplinPlugins {
    private logger;
    private plugin;
    constructor(logger: Logger, plugin: Plugin);
    register(script: any): Promise<void>;
}
