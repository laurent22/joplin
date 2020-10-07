import Plugin from '../Plugin';
import { ViewHandle } from './types';
export default class JoplinViewsPanels {
    private store;
    private plugin;
    constructor(plugin: Plugin, store: any);
    private controller;
    create(): Promise<string>;
    setHtml(handle: ViewHandle, html: string): Promise<string>;
    addScript(handle: ViewHandle, scriptPath: string): Promise<void>;
    onMessage(handle: ViewHandle, callback: Function): Promise<void>;
}
