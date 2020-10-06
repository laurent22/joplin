import ElectronAppWrapper from './ElectronAppWrapper';
export declare class Bridge {
    private electronWrapper_;
    private lastSelectedPaths_;
    constructor(electronWrapper: ElectronAppWrapper);
    electronApp(): ElectronAppWrapper;
    env(): string;
    processArgv(): string[];
    window(): any;
    showItemInFolder(fullPath: string): any;
    newBrowserWindow(options: any): any;
    windowContentSize(): {
        width: any;
        height: any;
    };
    windowSize(): {
        width: any;
        height: any;
    };
    windowSetSize(width: number, height: number): any;
    openDevTools(): any;
    closeDevTools(): any;
    showSaveDialog(options: any): any;
    showOpenDialog(options: any): any;
    showMessageBox_(window: any, options: any): any;
    showErrorMessageBox(message: string): any;
    showConfirmMessageBox(message: string, options?: any): boolean;
    showMessageBox(message: string, options?: any): any;
    showInfoMessageBox(message: string, options?: any): boolean;
    setLocale(locale: string): void;
    get Menu(): any;
    get MenuItem(): any;
    openExternal(url: string): any;
    openItem(fullPath: string): any;
    checkForUpdates(inBackground: boolean, window: any, logFilePath: string, options: any): void;
    buildDir(): string;
    screen(): any;
    shouldUseDarkColors(): any;
    addEventListener(name: string, fn: Function): void;
    restart(): void;
}
export declare function initBridge(wrapper: ElectronAppWrapper): Bridge;
export default function bridge(): Bridge;
