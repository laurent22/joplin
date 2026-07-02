import Plugin from '../Plugin';
import Joplin from './Joplin';
import BasePlatformImplementation from '../BasePlatformImplementation';
import type { Store } from 'redux';
/**
 * @ignore
 */
/**
 * @ignore
 */
export default class Global {
    private joplin_;
    constructor(implementation: BasePlatformImplementation, plugin: Plugin, store: Store<any>);
    get joplin(): Joplin;
    get process(): NodeJS.Process;
}
