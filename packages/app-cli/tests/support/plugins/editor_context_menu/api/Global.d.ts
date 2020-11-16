import Plugin from '../Plugin';
import Joplin from './Joplin';
import Logger from '../../../Logger';
/**
 * @ignore
 */
export default class Global {
    private joplin_;
    private requireWhiteList_;
    constructor(logger: Logger, implementation: any, plugin: Plugin, store: any);
    get joplin(): Joplin;
    private requireWhiteList;
    require(filePath: string): any;
    get process(): any;
}
