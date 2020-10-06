import { ViewHandle } from './utils/createViewHandle';
export default class ViewController {
    private handle_;
    private pluginId_;
    private store_;
    constructor(handle: ViewHandle, pluginId: string, store: any);
    protected get storeView(): any;
    protected get store(): any;
    get pluginId(): string;
    get key(): string;
    get handle(): ViewHandle;
    get type(): string;
    emitMessage(event: any): void;
}
