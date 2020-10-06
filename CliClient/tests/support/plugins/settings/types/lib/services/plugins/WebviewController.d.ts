import ViewController from './ViewController';
export interface ButtonSpec {
    id: string;
    title?: string;
    onClick?(): void;
}
export declare enum ContainerType {
    Panel = "panel",
    Dialog = "dialog"
}
export interface Options {
    containerType: ContainerType;
}
export default class WebviewController extends ViewController {
    private baseDir_;
    private messageListener_;
    private closeResponse_;
    constructor(id: string, pluginId: string, store: any, baseDir: string);
    get type(): string;
    private setStoreProp;
    get html(): string;
    set html(html: string);
    get containerType(): ContainerType;
    set containerType(containerType: ContainerType);
    addScript(path: string): Promise<void>;
    emitMessage(event: any): void;
    onMessage(callback: any): void;
    open(): Promise<unknown>;
    close(): Promise<void>;
    closeWithResponse(result: any): void;
    get buttons(): ButtonSpec[];
    set buttons(buttons: ButtonSpec[]);
}
