import Plugin from '../Plugin';
import Joplin from './Joplin';
/**
 * @ignore
 */
/**
 * @ignore
 */
export default class Global {
    private joplin_;
    constructor(implementation: any, plugin: Plugin, store: any);
    get joplin(): Joplin;
    get process(): any;
}
