import Plugin from '../Plugin';
import Joplin from './Joplin';
import Logger from 'lib/Logger';
export default class Global {
    private joplin_;
    constructor(logger: Logger, implementation: any, plugin: Plugin, store: any);
    get joplin(): Joplin;
    require(filePath: string): any;
    get process(): any;
}
