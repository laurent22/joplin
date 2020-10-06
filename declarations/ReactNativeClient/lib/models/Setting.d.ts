declare const BaseModel: any;
export declare enum SettingItemType {
    Int = 1,
    String = 2,
    Bool = 3,
    Array = 4,
    Object = 5,
    Button = 6
}
interface KeysOptions {
    secureOnly?: boolean;
}
export interface SettingItem {
    value: any;
    type: SettingItemType;
    public: boolean;
    subType?: string;
    key?: string;
    isEnum?: boolean;
    section?: string;
    label?(): string;
    description?(appType: string): string;
    options?(): any;
    appTypes?: string[];
    show?(settings: any): boolean;
    filter?(value: any): any;
    secure?: boolean;
    advanced?: boolean;
    minimum?: number;
    maximum?: number;
    step?: number;
    onClick?(): void;
    unitLabel?(value: any): string;
}
interface SettingItems {
    [key: string]: SettingItem;
}
export interface SettingSection {
    label: string;
    iconName?: string;
    description?: string;
    name?: string;
}
declare class Setting extends BaseModel {
    private static metadata_;
    private static keychainService_;
    private static keys_;
    private static cache_;
    private static saveTimeoutId_;
    private static customMetadata_;
    private static customSections_;
    static tableName(): string;
    static modelType(): any;
    static reset(): Promise<void>;
    static keychainService(): any;
    static setKeychainService(s: any): void;
    static metadata(): SettingItems;
    private static validateKey;
    static registerSetting(key: string, metadataItem: SettingItem): Promise<void>;
    static registerSection(name: string, section: SettingSection): Promise<void>;
    static settingMetadata(key: string): SettingItem;
    static keyExists(key: string): boolean;
    static keyDescription(key: string, appType?: string): string;
    static isSecureKey(key: string): boolean;
    static keys(publicOnly?: boolean, appType?: string, options?: KeysOptions): string[];
    static isPublic(key: string): boolean;
    static loadOne(key: string): any;
    static load(): any;
    static toPlainObject(): any;
    static dispatchUpdateAll(): void;
    static setConstant(key: string, value: any): void;
    static setValue(key: string, value: any): void;
    static incValue(key: string, inc: any): void;
    static toggle(key: string): void;
    static objectValue(settingKey: string, objectKey: string, defaultValue?: any): any;
    static setObjectValue(settingKey: string, objectKey: string, value: any): void;
    static deleteObjectValue(settingKey: string, objectKey: string): void;
    static deleteKeychainPasswords(): Promise<void>;
    static valueToString(key: string, value: any): any;
    static filterValue(key: string, value: any): any;
    static formatValue(key: string, value: any): any;
    static value(key: string): any;
    static isEnum(key: string): boolean;
    static enumOptionValues(key: string): string[];
    static enumOptionLabel(key: string, value: any): any;
    static enumOptions(key: string): any;
    static enumOptionsDoc(key: string, templateString?: string): string;
    static isAllowedEnumOption(key: string, value: any): boolean;
    static subValues(baseKey: string, settings: any, options?: any): any;
    static saveAll(): Promise<void>;
    static scheduleSave(): void;
    static cancelScheduleSave(): void;
    static publicSettings(appType: string): any;
    static typeToString(typeId: number): "object" | "string" | "int" | "bool" | "array";
    static groupMetadatasBySections(metadatas: SettingItem[]): any[];
    static sectionNameToLabel(name: string): any;
    static sectionDescription(name: string): any;
    static sectionNameToIcon(name: string): string;
    static appTypeToLabel(name: string): string;
}
export default Setting;
