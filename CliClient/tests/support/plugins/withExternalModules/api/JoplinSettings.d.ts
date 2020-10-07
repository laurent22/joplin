import Plugin from '../Plugin';
export declare enum SettingItemType {
    Int = 1,
    String = 2,
    Bool = 3,
    Array = 4,
    Object = 5,
    Button = 6
}
interface SettingItem {
    value: any;
    type: SettingItemType;
    public: boolean;
    label: string;
    description?: string;
    isEnum?: boolean;
    section?: string;
    options?: any;
    appTypes?: string[];
    secure?: boolean;
    advanced?: boolean;
    minimum?: number;
    maximum?: number;
    step?: number;
}
export interface SettingSection {
    label: string;
    iconName?: string;
    description?: string;
    name?: string;
}
export default class JoplinSettings {
    private plugin_;
    constructor(plugin: Plugin);
    private namespacedKey;
    registerSetting(key: string, settingItem: SettingItem): Promise<void>;
    registerSection(name: string, section: SettingSection): Promise<void>;
    value(key: string): Promise<any>;
    setValue(key: string, value: any): Promise<void>;
}
export {};
