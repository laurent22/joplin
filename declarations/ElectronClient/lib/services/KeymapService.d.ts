import { KeyboardEvent } from 'react';
declare const BaseService: any;
export interface KeymapItem {
    accelerator: string;
    command: string;
}
export default class KeymapService extends BaseService {
    private keymap;
    private platform;
    private customKeymapPath;
    private defaultKeymapItems;
    private lastSaveTime_;
    constructor();
    get lastSaveTime(): number;
    initialize(platform?: string): void;
    loadCustomKeymap(customKeymapPath: string): Promise<void>;
    saveCustomKeymap(customKeymapPath?: string): Promise<void>;
    acceleratorExists(command: string): boolean;
    private convertToPlatform;
    registerCommandAccelerator(commandName: string, accelerator: string): void;
    setAccelerator(command: string, accelerator: string): void;
    getAccelerator(command: string): string;
    getDefaultAccelerator(command: string): string;
    getCommandNames(): string[];
    getKeymapItems(): KeymapItem[];
    getCustomKeymapItems(): KeymapItem[];
    getDefaultKeymapItems(): KeymapItem[];
    overrideKeymap(customKeymapItems: KeymapItem[]): void;
    private validateKeymapItem;
    validateKeymap(proposedKeymapItem?: KeymapItem): void;
    validateAccelerator(accelerator: string): void;
    domToElectronAccelerator(event: KeyboardEvent<HTMLDivElement>): string;
    static domToElectronKey(domKey: string): string;
    on(eventName: string, callback: Function): void;
    off(eventName: string, callback: Function): void;
    private static instance_;
    static instance(): KeymapService;
}
export {};
