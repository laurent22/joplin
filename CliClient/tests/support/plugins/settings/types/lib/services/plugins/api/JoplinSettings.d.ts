import { SettingItemType, SettingSection } from 'lib/models/Setting';
import Plugin from '../Plugin';
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
