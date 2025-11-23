"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
const shim_1 = require("../shim");
const locale_1 = require("../locale");
const eventManager_1 = require("../eventManager");
const BaseModel_1 = require("../BaseModel");
const database_1 = require("../database");
const FileHandler_1 = require("./settings/FileHandler");
const Logger_1 = require("@joplin/utils/Logger");
const mergeGlobalAndLocalSettings_1 = require("../services/profileConfig/mergeGlobalAndLocalSettings");
const splitGlobalAndLocalSettings_1 = require("../services/profileConfig/splitGlobalAndLocalSettings");
const JoplinError_1 = require("../JoplinError");
const builtInMetadata_1 = require("./settings/builtInMetadata");
const path_1 = require("@joplin/utils/path");
const types_1 = require("./settings/types");
const { sprintf } = require("sprintf-js");
const logger = Logger_1.default.create("models/Setting");
__exportStar(require("./settings/types"), exports);
// To create a default migration:
//
// - Set the new default value in the setting metadata
// - Add an entry below with the name of the setting and the **previous**
//   default value.
//
// **Never** removes an item from this array, as the array index is essentially
// the migration ID.
const defaultMigrations = [
    {
        name: "sync.target",
        previousDefault: 7,
    },
    {
        name: "style.editor.contentMaxWidth",
        previousDefault: 600,
    },
    {
        name: "themeAutoDetect",
        previousDefault: false,
    },
    {
        name: "ocr.enabled",
        previousDefault: false,
    },
];
// The array index is the migration ID -- items should not be removed from this array.
const globalMigrations = [
    {
        name: "ui.layout",
        wasGlobal: true,
    },
    {
        name: "notes.sortOrder.field",
        wasGlobal: true,
    },
    {
        name: "notes.sortOrder.reverse",
        wasGlobal: true,
    },
    {
        name: "notes.listRendererId",
        wasGlobal: true,
    },
];
const userSettingMigration = [
    {
        oldName: "spellChecker.language",
        newName: "spellChecker.languages",
        transformValue: (value) => {
            return [value];
        },
    },
];
// Certain settings for similar (or the same) functionality can conflict. This map
// allows automatically adjusting settings when conflicting settings are changed.
// See https://github.com/laurent22/joplin/issues/13048
const conflictingSettings = [
    {
        key1: "plugin-io.github.personalizedrefrigerator.codemirror6-settings.hideMarkdown",
        value1: "some",
        alternate1: "none",
        key2: "editor.inlineRendering",
        value2: true,
        alternate2: false,
    },
    {
        key1: "plugin-plugin.calebjohn.rich-markdown.inlineImages",
        value1: true,
        alternate1: false,
        key2: "editor.imageRendering",
        value2: true,
        alternate2: false,
    },
];
class Setting extends BaseModel_1.default {
    static tableName() {
        return "settings";
    }
    static modelType() {
        return BaseModel_1.default.TYPE_SETTING;
    }
    static async reset() {
        if (this.saveTimeoutId_)
            shim_1.default.clearTimeout(this.saveTimeoutId_);
        if (this.changeEventTimeoutId_)
            shim_1.default.clearTimeout(this.changeEventTimeoutId_);
        this.saveTimeoutId_ = null;
        this.changeEventTimeoutId_ = null;
        this.metadata_ = null;
        this.keys_ = null;
        this.cache_ = [];
        this.customMetadata_ = {};
        this.fileHandler_ = null;
        this.rootFileHandler_ = null;
    }
    static get settingFilePath() {
        return `${this.value("profileDir")}/${this.settingFilename_}`;
    }
    static get rootSettingFilePath() {
        return `${this.value("rootProfileDir")}/${this.settingFilename_}`;
    }
    static get settingFilename() {
        return this.settingFilename_;
    }
    static set settingFilename(v) {
        this.settingFilename_ = v;
    }
    static get fileHandler() {
        if (!this.fileHandler_) {
            this.fileHandler_ = new FileHandler_1.default(this.settingFilePath);
        }
        return this.fileHandler_;
    }
    static get rootFileHandler() {
        if (!this.rootFileHandler_) {
            this.rootFileHandler_ = new FileHandler_1.default(this.rootSettingFilePath);
        }
        return this.rootFileHandler_;
    }
    static keychainService() {
        if (!this.keychainService_)
            throw new Error("keychainService has not been set!!");
        return this.keychainService_;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static setKeychainService(s) {
        this.keychainService_ = s;
    }
    static metadata() {
        if (this.metadata_)
            return this.metadata_;
        this.buildInMetadata_ = (0, builtInMetadata_1.default)(this);
        this.metadata_ = Object.assign({}, this.buildInMetadata_);
        this.metadata_ = Object.assign(Object.assign({}, this.metadata_), this.customMetadata_);
        if (this.constants_.env === types_1.Env.Dev)
            this.validateMetadata(this.metadata_);
        return this.metadata_;
    }
    static validateMetadata(md) {
        for (const [k, v] of Object.entries(md)) {
            if (v.isGlobal && v.storage !== types_1.SettingStorage.File)
                throw new Error(`Setting "${k}" is global but storage is not "file"`);
        }
    }
    static isBuiltinKey(key) {
        return key in this.buildInMetadata_;
    }
    static customCssFilePath(filename) {
        return `${this.value("rootProfileDir")}/${filename}`;
    }
    static skipMigrations() {
        logger.info("Skipping all default migrations...");
        this.setValue("lastSettingDefaultMigration", defaultMigrations.length - 1);
        this.setValue("lastSettingGlobalMigration", globalMigrations.length - 1);
    }
    static async applyMigrations() {
        const applyDefaultMigrations = () => {
            logger.info("Applying default migrations...");
            const lastSettingDefaultMigration = this.value("lastSettingDefaultMigration");
            for (let i = 0; i < defaultMigrations.length; i++) {
                if (i <= lastSettingDefaultMigration)
                    continue;
                const migration = defaultMigrations[i];
                logger.info(`Applying default migration: ${migration.name}`);
                if (this.isSet(migration.name)) {
                    logger.info("Skipping because value is already set");
                    continue;
                }
                else {
                    logger.info(`Applying previous default: ${migration.previousDefault}`);
                    this.setValue(migration.name, migration.previousDefault);
                }
            }
            this.setValue("lastSettingDefaultMigration", defaultMigrations.length - 1);
        };
        const applyGlobalMigrations = async () => {
            const lastGlobalMigration = this.value("lastSettingGlobalMigration");
            let rootFileSettings_ = null;
            const rootFileSettings = async () => {
                rootFileSettings_ !== null && rootFileSettings_ !== void 0 ? rootFileSettings_ : (rootFileSettings_ = await this.rootFileHandler.load());
                return rootFileSettings_;
            };
            for (let i = 0; i < globalMigrations.length; i++) {
                if (i <= lastGlobalMigration)
                    continue;
                const migration = globalMigrations[i];
                // Skip migrations if the setting is stored in the database and thus
                // probably can't be fetched from the root profile. This is, for example,
                // the case on mobile.
                if (this.keyStorage(migration.name) !== types_1.SettingStorage.File) {
                    logger.info("Skipped global value migration -- setting is not stored as a file.");
                    continue;
                }
                logger.info(`Applying global migration: ${migration.name}`);
                if (!migration.wasGlobal) {
                    throw new Error("Converting a non-global setting to a global setting is not supported.");
                }
                const rootSettings = await rootFileSettings();
                if (Object.prototype.hasOwnProperty.call(rootSettings, migration.name)) {
                    this.setValue(migration.name, rootSettings[migration.name]);
                }
            }
            this.setValue("lastSettingGlobalMigration", globalMigrations.length - 1);
        };
        const applyUserSettingMigrations = () => {
            // Function to translate existing user settings to new setting.
            // eslint-disable-next-line github/array-foreach -- Old code before rule was applied
            userSettingMigration.forEach((userMigration) => {
                if (!this.isSet(userMigration.newName) &&
                    this.isSet(userMigration.oldName)) {
                    this.setValue(userMigration.newName, userMigration.transformValue(this.value(userMigration.oldName)));
                    logger.info(`Migrating ${userMigration.oldName} to ${userMigration.newName}`);
                }
            });
        };
        applyDefaultMigrations();
        await applyGlobalMigrations();
        applyUserSettingMigrations();
    }
    static featureFlagKeys(appType) {
        const keys = this.keys(false, appType);
        return keys.filter((k) => k.indexOf("featureFlag.") === 0);
    }
    static validateKey(key) {
        if (!key)
            throw new Error("Cannot register empty key");
        if (key.length > 128)
            throw new Error(`Key length cannot be longer than 128 characters: ${key}`);
        if (!key.match(/^[a-zA-Z0-9_\-.]+$/))
            throw new Error(`Key must only contain characters /a-zA-Z0-9_-./ : ${key}`);
    }
    static validateType(type) {
        if (!Number.isInteger(type))
            throw new Error(`Setting type is not an integer: ${type}`);
        if (type < 0)
            throw new Error(`Invalid setting type: ${type}`);
    }
    static async registerSetting(key, metadataItem) {
        try {
            if (metadataItem.isEnum && !metadataItem.options)
                throw new Error("The `options` property is required for enum types");
            this.validateKey(key);
            this.validateType(metadataItem.type);
            this.customMetadata_[key] = Object.assign(Object.assign({}, metadataItem), { value: this.formatValue(metadataItem.type, metadataItem.value) });
            // Clear cache
            this.metadata_ = null;
            this.keys_ = null;
            // Reload the value from the database, if it was already present
            const valueRow = await this.loadOne(key);
            if (valueRow) {
                // Remove any duplicate copies of the setting -- if multiple items in cache_
                // have the same key, we may encounter unique key errors while saving to the
                // database.
                this.cache_ = this.cache_.filter((setting) => setting.key !== key);
                this.cache_.push({
                    key: key,
                    value: this.formatValue(key, valueRow.value),
                });
            }
            this.dispatch({
                type: "SETTING_UPDATE_ONE",
                key: key,
                value: this.value(key),
            });
        }
        catch (error) {
            error.message = `Could not register setting "${key}": ${error.message}`;
            throw error;
        }
    }
    static async registerSection(name, source, section) {
        this.customSections_[name] = Object.assign(Object.assign({}, section), { name: name, source: source });
    }
    static settingMetadata(key) {
        const metadata = this.metadata();
        if (!(key in metadata))
            throw new JoplinError_1.default(`Unknown key: ${key}`, "unknown_key");
        const output = Object.assign({}, metadata[key]);
        output.key = key;
        return output;
    }
    // Resets the key to its default value.
    static resetKey(key) {
        const md = this.settingMetadata(key);
        this.setValue(key, md.value);
    }
    static keyExists(key) {
        return key in this.metadata();
    }
    static isSet(key) {
        return !!this.cache_.find((d) => d.key === key);
    }
    static keyDescription(key, appType = null) {
        const md = this.settingMetadata(key);
        if (!md.description)
            return null;
        return md.description(appType);
    }
    static isSecureKey(key) {
        return this.metadata()[key] && this.metadata()[key].secure === true;
    }
    static keys(publicOnly = false, appType = null, options = null) {
        options = Object.assign({ secureOnly: false }, options);
        if (!this.keys_) {
            const metadata = this.metadata();
            this.keys_ = [];
            for (const n in metadata) {
                if (!metadata.hasOwnProperty(n))
                    continue;
                this.keys_.push(n);
            }
        }
        if (appType || publicOnly || options.secureOnly) {
            const output = [];
            for (let i = 0; i < this.keys_.length; i++) {
                const md = this.settingMetadata(this.keys_[i]);
                if (publicOnly && !md.public)
                    continue;
                if (appType && md.appTypes && md.appTypes.indexOf(appType) < 0)
                    continue;
                if (options.secureOnly && !md.secure)
                    continue;
                output.push(md.key);
            }
            return output;
        }
        else {
            return this.keys_;
        }
    }
    static isPublic(key) {
        return this.keys(true).indexOf(key) >= 0;
    }
    // Low-level method to load a setting directly from the database. Should not be used in most cases.
    // Does not apply setting default values.
    static async loadOne(key) {
        if (this.keyStorage(key) === types_1.SettingStorage.File) {
            let fileSettings = await this.fileHandler.load();
            const md = this.settingMetadata(key);
            if (md.isGlobal) {
                const rootFileSettings = await this.rootFileHandler.load();
                fileSettings = (0, mergeGlobalAndLocalSettings_1.default)(rootFileSettings, fileSettings);
            }
            if (key in fileSettings) {
                return {
                    key,
                    value: fileSettings[key],
                };
            }
            else {
                return null;
            }
        }
        // Always check in the database first, including for secure settings,
        // because that's where they would be if the keychain is not enabled (or
        // if writing to the keychain previously failed).
        //
        // https://github.com/laurent22/joplin/issues/5720
        const row = await this.modelSelectOne("SELECT * FROM settings WHERE key = ?", [key]);
        if (row)
            return row;
        if (this.settingMetadata(key).secure) {
            return {
                key,
                value: await this.keychainService().password(`setting.${key}`),
            };
        }
        return null;
    }
    static async load() {
        this.cancelScheduleSave();
        this.cancelScheduleChangeEvent();
        this.cache_ = [];
        const rows = await this.modelSelectAll("SELECT * FROM settings");
        // Keys in the database takes precedence over keys in the keychain because
        // they are more likely to be up to date (saving to keychain can fail, but
        // saving to database shouldn't). When the keychain works, the secure keys
        // are deleted from the database and transferred to the keychain in saveAll().
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const rowKeys = rows.map((r) => r.key);
        const secureKeys = this.keys(false, null, { secureOnly: true });
        const secureItems = [];
        for (const key of secureKeys) {
            if (rowKeys.includes(key))
                continue;
            const password = await this.keychainService().password(`setting.${key}`);
            if (password) {
                secureItems.push({
                    key: key,
                    value: password,
                });
            }
        }
        const itemsFromFile = [];
        if (this.canUseFileStorage()) {
            let fileSettings = await this.fileHandler.load();
            if (this.value("isSubProfile")) {
                const rootFileSettings = await this.rootFileHandler.load();
                fileSettings = (0, mergeGlobalAndLocalSettings_1.default)(rootFileSettings, fileSettings);
            }
            for (const k of Object.keys(fileSettings)) {
                itemsFromFile.push({
                    key: k,
                    value: fileSettings[k],
                });
            }
        }
        this.cache_ = [];
        const cachedKeys = new Set();
        const pushItemsToCache = (items) => {
            for (let i = 0; i < items.length; i++) {
                const c = items[i];
                // Avoid duplicating keys -- doing so causes save issues.
                if (cachedKeys.has(c.key))
                    continue;
                if (!this.keyExists(c.key))
                    continue;
                c.value = this.formatValue(c.key, c.value);
                c.value = this.filterValue(c.key, c.value);
                cachedKeys.add(c.key);
                this.cache_.push(c);
            }
        };
        pushItemsToCache(rows);
        pushItemsToCache(secureItems);
        pushItemsToCache(itemsFromFile);
        this.dispatchUpdateAll();
    }
    static canUseFileStorage() {
        return this.allowFileStorage && !shim_1.default.mobilePlatform();
    }
    static keyStorage(key) {
        if (!this.canUseFileStorage())
            return types_1.SettingStorage.Database;
        const md = this.settingMetadata(key);
        return md.storage || types_1.SettingStorage.Database;
    }
    static toPlainObject() {
        const keys = this.keys();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const keyToValues = {};
        for (let i = 0; i < keys.length; i++) {
            keyToValues[keys[i]] = this.value(keys[i]);
        }
        return keyToValues;
    }
    static dispatchUpdateAll() {
        this.dispatch({
            type: "SETTING_UPDATE_ALL",
            settings: this.toPlainObject(),
        });
    }
    static setConstant(key, value) {
        if (!(key in this.constants_))
            throw new Error(`Unknown constant key: ${key}`);
        this.constants_[key] = value;
    }
    static setValue(key, value) {
        if (!this.cache_)
            throw new Error("Settings have not been initialized!");
        const md = this.settingMetadata(key);
        const processValue = (value) => {
            value = this.formatValue(key, value);
            value = this.filterValue(key, value);
            if ("minimum" in md && value < md.minimum)
                value = md.minimum;
            if ("maximum" in md && value > md.maximum)
                value = md.maximum;
            return value;
        };
        const setValueInternal = (key, value) => {
            value = processValue(value);
            for (let i = 0; i < this.cache_.length; i++) {
                const c = this.cache_[i];
                if (c.key === key) {
                    if (md.isEnum === true) {
                        if (!this.isAllowedEnumOption(key, value)) {
                            throw new Error((0, locale_1._)('Invalid option value: "%s". Possible values are: %s.', value, this.enumOptionsDoc(key)));
                        }
                    }
                    if (c.value === value)
                        return;
                    this.changedKeys_.push(key);
                    // Don't log this to prevent sensitive info (passwords, auth tokens...) to end up in logs
                    // logger.info('Setting: ' + key + ' = ' + c.value + ' => ' + value);
                    c.value = value;
                    this.dispatch({
                        type: "SETTING_UPDATE_ONE",
                        key: key,
                        value: c.value,
                    });
                    this.scheduleSave();
                    this.scheduleChangeEvent();
                    return;
                }
            }
            this.cache_.push({
                key: key,
                value: this.formatValue(key, value),
            });
            this.dispatch({
                type: "SETTING_UPDATE_ONE",
                key: key,
                value: this.formatValue(key, value),
            });
            this.changedKeys_.push(key);
            this.scheduleSave();
            this.scheduleChangeEvent();
        };
        const setValueInternalIfExists = (key, value) => {
            if (!this.keyExists(key))
                return;
            setValueInternal(key, value);
        };
        setValueInternal(key, value);
        // Prevent conflicts. Use setValueInternal to avoid infinite recursion in the case
        // where conflictingSettings has invalid data.
        for (const conflict of conflictingSettings) {
            if (conflict.key1 === key && conflict.value1 === value) {
                setValueInternalIfExists(conflict.key2, conflict.alternate2);
            }
            else if (conflict.key2 === key && conflict.value2 === value) {
                setValueInternalIfExists(conflict.key1, conflict.alternate1);
            }
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static incValue(key, inc) {
        return this.setValue(key, this.value(key) + inc);
    }
    static toggle(key) {
        return this.setValue(key, !this.value(key));
    }
    // this method checks if the 'value' passed is present in the Setting "Array"
    // If yes, then it just returns 'true'. If its not present then, it will
    // update it and return 'false'
    static setArrayValue(settingName, value) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const settingValue = this.value(settingName);
        if (settingValue.includes(value))
            return true;
        settingValue.push(value);
        this.setValue(settingName, settingValue);
        return false;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static objectValue(settingKey, objectKey, defaultValue = null) {
        const o = this.value(settingKey);
        if (!o || !(objectKey in o))
            return defaultValue;
        return o[objectKey];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static setObjectValue(settingKey, objectKey, value) {
        let o = this.value(settingKey);
        if (typeof o !== "object")
            o = {};
        o[objectKey] = value;
        this.setValue(settingKey, o);
    }
    static deleteObjectValue(settingKey, objectKey) {
        const o = this.value(settingKey);
        if (typeof o !== "object")
            return;
        delete o[objectKey];
        this.setValue(settingKey, o);
    }
    static async deleteKeychainPasswords() {
        const secureKeys = this.keys(false, null, { secureOnly: true });
        for (const key of secureKeys) {
            await this.keychainService().deletePassword(`setting.${key}`);
        }
    }
    static enumOptionsToValueLabels(enumOptions, order, options = null) {
        options = Object.assign({ labelKey: "label", valueKey: "value" }, options);
        const output = [];
        for (const value of order) {
            if (!Object.prototype.hasOwnProperty.call(enumOptions, value))
                continue;
            output.push({
                [options.valueKey]: value,
                [options.labelKey]: enumOptions[value],
            });
        }
        for (const k in enumOptions) {
            if (!Object.prototype.hasOwnProperty.call(enumOptions, k))
                continue;
            if (order.includes(k))
                continue;
            output.push({
                [options.valueKey]: k,
                [options.labelKey]: enumOptions[k],
            });
        }
        return output;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static valueToString(key, value) {
        const md = this.settingMetadata(key);
        value = this.formatValue(key, value);
        if (md.type === types_1.SettingItemType.Int)
            return value.toFixed(0);
        if (md.type === types_1.SettingItemType.Bool)
            return value ? "1" : "0";
        if (md.type === types_1.SettingItemType.Array)
            return value ? JSON.stringify(value) : "[]";
        if (md.type === types_1.SettingItemType.Object)
            return value ? JSON.stringify(value) : "{}";
        if (md.type === types_1.SettingItemType.String)
            return value ? `${value}` : "";
        throw new Error(`Unhandled value type: ${md.type}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static filterValue(key, value) {
        const md = this.settingMetadata(key);
        return md.filter ? md.filter(value) : value;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static formatValue(key, value) {
        const type = typeof key === "string" ? this.settingMetadata(key).type : key;
        if (type === types_1.SettingItemType.Int)
            return !value ? 0 : Math.floor(Number(value));
        if (type === types_1.SettingItemType.Bool) {
            if (typeof value === "string") {
                value = value.toLowerCase();
                if (value === "true")
                    return true;
                if (value === "false")
                    return false;
                value = Number(value);
            }
            return !!value;
        }
        if (type === types_1.SettingItemType.Array) {
            if (!value)
                return [];
            if (Array.isArray(value))
                return value;
            if (typeof value === "string")
                return JSON.parse(value);
            return [];
        }
        if (type === types_1.SettingItemType.Object) {
            if (!value)
                return {};
            if (typeof value === "object")
                return value;
            if (typeof value === "string")
                return JSON.parse(value);
            return {};
        }
        if (type === types_1.SettingItemType.String) {
            if (!value)
                return "";
            return `${value}`;
        }
        throw new Error(`Unhandled value type: ${type}`);
    }
    static value(key) {
        // Need to copy arrays and objects since in setValue(), the old value and new one is compared
        // with strict equality and the value is updated only if changed. However if the caller acquire
        // an object and change a key, the objects will be detected as equal. By returning a copy
        // we avoid this problem.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        function copyIfNeeded(value) {
            if (value === null || value === undefined)
                return value;
            if (Array.isArray(value))
                return value.slice();
            if (typeof value === "object")
                return Object.assign({}, value);
            return value;
        }
        if (key in this.constants_) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            const v = this.constants_[key];
            const output = typeof v === "function" ? v() : v;
            if (output === "SET_ME")
                throw new Error(`SET_ME constant has not been set: ${key}`);
            return output;
        }
        if (!this.cache_)
            throw new Error("Settings have not been initialized!");
        for (let i = 0; i < this.cache_.length; i++) {
            if (this.cache_[i].key === key) {
                return copyIfNeeded(this.cache_[i].value);
            }
        }
        const md = this.settingMetadata(key);
        return copyIfNeeded(md.value);
    }
    // This function returns the default value if the setting key does not exist.
    static valueNoThrow(key, defaultValue) {
        if (!this.keyExists(key))
            return defaultValue;
        return this.value(key);
    }
    static isEnum(key) {
        const md = this.settingMetadata(key);
        return md.isEnum === true;
    }
    static enumOptionValues(key) {
        const options = this.enumOptions(key);
        const output = [];
        for (const n in options) {
            if (!options.hasOwnProperty(n))
                continue;
            output.push(n);
        }
        return output;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static enumOptionLabel(key, value) {
        const options = this.enumOptions(key);
        for (const n in options) {
            if (n === value)
                return options[n];
        }
        return "";
    }
    static enumOptions(key) {
        const metadata = this.metadata();
        if (!metadata[key])
            throw new JoplinError_1.default(`Unknown key: ${key}`, "unknown_key");
        if (!metadata[key].options)
            throw new Error(`No options for: ${key}`);
        return metadata[key].options();
    }
    static enumOptionsDoc(key, templateString = null) {
        if (templateString === null)
            templateString = "%s: %s";
        const options = this.enumOptions(key);
        const output = [];
        for (const n in options) {
            if (!options.hasOwnProperty(n))
                continue;
            output.push(sprintf(templateString, n, options[n]));
        }
        return output.join(", ");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static isAllowedEnumOption(key, value) {
        const options = this.enumOptions(key);
        return !!options[value];
    }
    // For example, if settings is:
    // { sync.5.path: 'http://example', sync.5.username: 'testing' }
    // and baseKey is 'sync.5', the function will return
    // { path: 'http://example', username: 'testing' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static subValues(baseKey, settings, options = null) {
        const includeBaseKeyInName = !!options && !!options.includeBaseKeyInName;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const output = {};
        for (const key in settings) {
            if (!settings.hasOwnProperty(key))
                continue;
            if (key.indexOf(baseKey) === 0) {
                const subKey = includeBaseKeyInName
                    ? key
                    : key.substr(baseKey.length + 1);
                output[subKey] = settings[key];
            }
        }
        return output;
    }
    static async saveAll() {
        if (Setting.autoSaveEnabled && !this.saveTimeoutId_)
            return Promise.resolve();
        logger.debug("Saving settings...");
        shim_1.default.clearTimeout(this.saveTimeoutId_);
        this.saveTimeoutId_ = null;
        const keys = this.keys();
        const valuesForFile = {};
        for (const key of keys) {
            // undefined => Delete from settings JSON file.
            valuesForFile[key] = undefined;
        }
        const queries = [];
        queries.push(`DELETE FROM settings WHERE key IN ('${keys.join("','")}')`);
        for (let i = 0; i < this.cache_.length; i++) {
            const s = Object.assign({}, this.cache_[i]);
            const valueAsString = this.valueToString(s.key, s.value);
            if (this.isSecureKey(s.key)) {
                // We need to be careful here because there's a bug in the macOS keychain that can
                // make it fail to save a password. https://github.com/desktop/desktop/issues/3263
                // So we try to set it and if it fails, we set it on the database instead. This is not
                // ideal because they won't be encrypted, but better than losing all the user's passwords.
                // The passwords would be set again on the keychain once it starts working again (probably
                // after the user switch their computer off and on again).
                //
                // Also we don't control what happens on the keychain - the values can be edited or deleted
                // outside the application. For that reason, we rewrite it every time the values are saved,
                // even if, internally, they haven't changed.
                try {
                    const passwordName = `setting.${s.key}`;
                    const wasSet = await this.keychainService().setPassword(passwordName, valueAsString);
                    if (wasSet)
                        continue;
                }
                catch (error) {
                    logger.error(`Could not set setting on the keychain. Will be saved to database instead: ${s.key}:`, error);
                }
            }
            if (this.keyStorage(s.key) === types_1.SettingStorage.File) {
                valuesForFile[s.key] = s.value;
            }
            else {
                queries.push(database_1.default.insertQuery(this.tableName(), {
                    key: s.key,
                    value: valueAsString,
                }));
            }
        }
        await BaseModel_1.default.db().transactionExecBatch(queries);
        if (this.canUseFileStorage()) {
            if (this.value("isSubProfile")) {
                const { globalSettings, localSettings } = (0, splitGlobalAndLocalSettings_1.default)(valuesForFile);
                const currentGlobalSettings = await this.rootFileHandler.load();
                // When saving to the root setting file, we preserve the
                // existing settings, which are specific to the root profile,
                // and add the global settings.
                await this.rootFileHandler.save(Object.assign(Object.assign({}, currentGlobalSettings), globalSettings));
                await this.fileHandler.save(localSettings);
            }
            else {
                await this.fileHandler.save(valuesForFile);
            }
        }
        logger.debug("Settings have been saved.");
    }
    static scheduleChangeEvent() {
        if (this.changeEventTimeoutId_)
            shim_1.default.clearTimeout(this.changeEventTimeoutId_);
        this.changeEventTimeoutId_ = shim_1.default.setTimeout(() => {
            this.emitScheduledChangeEvent();
        }, 1000);
    }
    static cancelScheduleChangeEvent() {
        if (this.changeEventTimeoutId_)
            shim_1.default.clearTimeout(this.changeEventTimeoutId_);
        this.changeEventTimeoutId_ = null;
    }
    static emitScheduledChangeEvent() {
        if (!this.changeEventTimeoutId_)
            return;
        shim_1.default.clearTimeout(this.changeEventTimeoutId_);
        this.changeEventTimeoutId_ = null;
        if (!this.changedKeys_.length) {
            // Sanity check - shouldn't happen
            logger.warn("Trying to dispatch a change event without any changed keys");
            return;
        }
        const keys = this.changedKeys_.slice();
        this.changedKeys_ = [];
        eventManager_1.default.emit(eventManager_1.EventName.SettingsChange, { keys });
    }
    static scheduleSave() {
        if (!Setting.autoSaveEnabled)
            return;
        if (this.saveTimeoutId_)
            shim_1.default.clearTimeout(this.saveTimeoutId_);
        this.saveTimeoutId_ = shim_1.default.setTimeout(async () => {
            try {
                await this.saveAll();
            }
            catch (error) {
                logger.error("Could not save settings", error);
            }
        }, 500);
    }
    static cancelScheduleSave() {
        if (this.saveTimeoutId_)
            shim_1.default.clearTimeout(this.saveTimeoutId_);
        this.saveTimeoutId_ = null;
    }
    static publicSettings(appType) {
        if (!appType)
            throw new Error("appType is required");
        const metadata = this.metadata();
        const output = {};
        for (const key in metadata) {
            if (!metadata.hasOwnProperty(key))
                continue;
            const s = Object.assign({}, metadata[key]);
            if (!s.public)
                continue;
            if (s.appTypes && s.appTypes.indexOf(appType) < 0)
                continue;
            s.value = this.value(key);
            output[key] = s;
        }
        return output;
    }
    static typeToString(typeId) {
        if (typeId === types_1.SettingItemType.Int)
            return "int";
        if (typeId === types_1.SettingItemType.String)
            return "string";
        if (typeId === types_1.SettingItemType.Bool)
            return "bool";
        if (typeId === types_1.SettingItemType.Array)
            return "array";
        if (typeId === types_1.SettingItemType.Object)
            return "object";
        throw new Error(`Invalid type ID: ${typeId}`);
    }
    static sectionOrder() {
        return [
            "general",
            "application",
            "appearance",
            "sync",
            "encryption",
            "joplinCloud",
            "plugins",
            "markdownPlugins",
            "note",
            "revisionService",
            "server",
            "keymap",
            "tools",
            "importOrExport",
            "moreInfo",
        ];
    }
    static sectionSource(sectionName) {
        if (this.customSections_[sectionName])
            return (this.customSections_[sectionName].source || types_1.SettingSectionSource.Default);
        return types_1.SettingSectionSource.Default;
    }
    static isSubSection(sectionName) {
        return ["encryption", "application", "appearance", "joplinCloud"].includes(sectionName);
    }
    static groupMetadatasBySections(metadatas) {
        const sections = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const generalSection = { name: "general", metadatas: [] };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const nameToSections = {};
        nameToSections["general"] = generalSection;
        sections.push(generalSection);
        for (let i = 0; i < metadatas.length; i++) {
            const md = metadatas[i];
            if (!md.section) {
                generalSection.metadatas.push(md);
            }
            else {
                if (!nameToSections[md.section]) {
                    nameToSections[md.section] = {
                        name: md.section,
                        metadatas: [],
                        source: this.sectionSource(md.section),
                    };
                    sections.push(nameToSections[md.section]);
                }
                nameToSections[md.section].metadatas.push(md);
            }
        }
        // for (const name in this.customSections_) {
        // 	nameToSections[name] = {
        // 		name: name,
        // 		source: this.customSections_[name].source,
        // 		metadatas: [],
        // 	};
        // }
        return sections;
    }
    static sectionNameToLabel(name) {
        if (name === "general")
            return (0, locale_1._)("General");
        if (name === "sync")
            return (0, locale_1._)("Synchronisation");
        if (name === "appearance")
            return (0, locale_1._)("Appearance");
        if (name === "note")
            return (0, locale_1._)("Note");
        if (name === "folder")
            return (0, locale_1._)("Notebook");
        if (name === "markdownPlugins")
            return (0, locale_1._)("Markdown");
        if (name === "plugins")
            return (0, locale_1._)("Plugins");
        if (name === "application")
            return (0, locale_1._)("Application");
        if (name === "revisionService")
            return (0, locale_1._)("Note History");
        if (name === "encryption")
            return (0, locale_1._)("Encryption");
        if (name === "server")
            return (0, locale_1._)("Web Clipper");
        if (name === "keymap")
            return (0, locale_1._)("Keyboard Shortcuts");
        if (name === "joplinCloud")
            return (0, locale_1._)("Joplin Cloud");
        if (name === "tools")
            return (0, locale_1._)("Tools");
        if (name === "importOrExport")
            return (0, locale_1._)("Import and Export");
        if (name === "moreInfo")
            return (0, locale_1._)("More information");
        if (this.customSections_[name] && this.customSections_[name].label)
            return this.customSections_[name].label;
        return name;
    }
    static sectionDescription(name, appType) {
        if (name === "markdownPlugins" && appType === types_1.AppType.Desktop) {
            return (0, locale_1._)("These plugins enhance the Markdown renderer with additional features. Please note that, while these features might be useful, they are not standard Markdown and thus most of them will only work in Joplin. Additionally, some of them are *incompatible* with the WYSIWYG editor. If you open a note that uses one of these plugins in that editor, you will lose the plugin formatting. It is indicated below which plugins are compatible or not with the WYSIWYG editor.");
        }
        if (name === "general" && appType === types_1.AppType.Desktop) {
            return (0, locale_1._)("Notes and settings are stored in: %s", (0, path_1.toSystemSlashes)(this.value("profileDir"), process.platform));
        }
        if (this.customSections_[name] && this.customSections_[name].description)
            return this.customSections_[name].description;
        return "";
    }
    static sectionMetadataToSummary(metadata) {
        var _a;
        // TODO: This is currently specific to the mobile app
        const sectionNameToSummary = {
            general: (0, locale_1._)("Language, date format"),
            appearance: (0, locale_1._)("Themes, editor font"),
            sync: (0, locale_1._)("Sync, encryption, proxy"),
            joplinCloud: (0, locale_1._)("Email To Note, login information"),
            markdownPlugins: (0, locale_1._)("Media player, math, diagrams, table of contents"),
            note: (0, locale_1._)("Geolocation, spellcheck, editor toolbar, image resize"),
            revisionService: (0, locale_1._)("Toggle note history, keep notes for"),
            tools: (0, locale_1._)("Logs, profiles, sync status"),
            importOrExport: (0, locale_1._)("Import or export your data"),
            plugins: (0, locale_1._)("Enable or disable plugins"),
            moreInfo: (0, locale_1._)("Donate, website"),
        };
        // In some cases (e.g. plugin settings pages) there is no preset summary.
        // In those cases, we generate the summary:
        const generateSummary = () => {
            var _a;
            const summary = [];
            for (const item of metadata.metadatas) {
                if (!item.public || item.advanced) {
                    continue;
                }
                if (item.label) {
                    const label = (_a = item.label) === null || _a === void 0 ? void 0 : _a.call(item);
                    summary.push(label);
                }
            }
            return summary.join(", ");
        };
        return (_a = sectionNameToSummary[metadata.name]) !== null && _a !== void 0 ? _a : generateSummary();
    }
    static sectionNameToIcon(name, appType) {
        const nameToIconMap = {
            general: "icon-general",
            sync: "icon-sync",
            appearance: "icon-appearance",
            note: "icon-note",
            folder: "icon-notebooks",
            plugins: "icon-plugins",
            markdownPlugins: "fab fa-markdown",
            application: "icon-application",
            revisionService: "icon-note-history",
            encryption: "icon-encryption",
            server: "far fa-hand-scissors",
            keymap: "fa fa-keyboard",
            joplinCloud: "fa fa-cloud",
            tools: "fa fa-toolbox",
            importOrExport: "fa fa-file-export",
            moreInfo: "fa fa-info-circle",
        };
        // Icomoon icons are currently not present in the mobile app -- we override these
        // below.
        //
        // These icons come from react-native-vector-icons.
        // See https://oblador.github.io/react-native-vector-icons/
        const mobileNameToIconMap = {
            general: "fa fa-sliders-h",
            sync: "fa fa-sync",
            appearance: "fa fa-ruler",
            note: "fa fa-sticky-note",
            revisionService: "far fa-history",
            plugins: "fa fa-puzzle-piece",
            application: "fa fa-cog",
            encryption: "fa fa-key",
        };
        // Overridden?
        if (appType === types_1.AppType.Mobile && name in mobileNameToIconMap) {
            return mobileNameToIconMap[name];
        }
        if (name in nameToIconMap) {
            return nameToIconMap[name];
        }
        if (this.customSections_[name] && this.customSections_[name].iconName)
            return this.customSections_[name].iconName;
        return "fas fa-cog";
    }
    static appTypeToLabel(name) {
        // Not translated for now because only used on Welcome notes (which are not translated)
        if (name === "cli")
            return "CLI";
        return name[0].toUpperCase() + name.substr(1).toLowerCase();
    }
    // IMPLEMENTAÇÃO MÍNIMA PARA CICLO 1 TDD - DESATIVAR SINCRONIZAÇÃO
    static disableSync() {
        this.setValue("sync.target", 0);
    }
}
Setting.schemaUrl = "https://joplinapp.org/schema/settings.json";
// For backward compatibility
Setting.TYPE_INT = types_1.SettingItemType.Int;
Setting.TYPE_STRING = types_1.SettingItemType.String;
Setting.TYPE_BOOL = types_1.SettingItemType.Bool;
Setting.TYPE_ARRAY = types_1.SettingItemType.Array;
Setting.TYPE_OBJECT = types_1.SettingItemType.Object;
Setting.TYPE_BUTTON = types_1.SettingItemType.Button;
Setting.THEME_LIGHT = 1;
Setting.THEME_DARK = 2;
Setting.THEME_OLED_DARK = 22;
Setting.THEME_SOLARIZED_LIGHT = 3;
Setting.THEME_SOLARIZED_DARK = 4;
Setting.THEME_DRACULA = 5;
Setting.THEME_NORD = 6;
Setting.THEME_ARITIM_DARK = 7;
Setting.FONT_DEFAULT = 0;
Setting.FONT_MENLO = 1;
Setting.FONT_COURIER_NEW = 2;
Setting.FONT_AVENIR = 3;
Setting.FONT_MONOSPACE = 4;
Setting.LAYOUT_ALL = 0;
Setting.LAYOUT_EDITOR_VIEWER = 1;
Setting.LAYOUT_EDITOR_SPLIT = 2;
Setting.LAYOUT_VIEWER_SPLIT = 3;
Setting.DATE_FORMAT_1 = "DD/MM/YYYY";
Setting.DATE_FORMAT_2 = "DD/MM/YY";
Setting.DATE_FORMAT_3 = "MM/DD/YYYY";
Setting.DATE_FORMAT_4 = "MM/DD/YY";
Setting.DATE_FORMAT_5 = "YYYY-MM-DD";
Setting.DATE_FORMAT_6 = "DD.MM.YYYY";
Setting.DATE_FORMAT_7 = "YYYY.MM.DD";
Setting.DATE_FORMAT_8 = "YYMMDD";
Setting.DATE_FORMAT_9 = "YYYY/MM/DD";
Setting.TIME_FORMAT_1 = "HH:mm";
Setting.TIME_FORMAT_2 = "h:mm A";
Setting.TIME_FORMAT_3 = "HH.mm";
Setting.SHOULD_REENCRYPT_NO = 0; // Data doesn't need to be re-encrypted
Setting.SHOULD_REENCRYPT_YES = 1; // Data should be re-encrypted
Setting.SHOULD_REENCRYPT_NOTIFIED = 2; // Data should be re-encrypted, and user has been notified
Setting.SYNC_UPGRADE_STATE_IDLE = 0; // Doesn't need to be upgraded
Setting.SYNC_UPGRADE_STATE_SHOULD_DO = 1; // Should be upgraded, but waiting for user to confirm
Setting.SYNC_UPGRADE_STATE_MUST_DO = 2; // Must be upgraded - on next restart, the upgrade will start
Setting.customCssFilenames = {
    JOPLIN_APP: "userchrome.css",
    RENDERED_MARKDOWN: "userstyle.css",
};
// Contains constants that are set by the application and
// cannot be modified by the user:
Setting.constants_ = {
    env: types_1.Env.Undefined,
    isDemo: false,
    appName: "joplin",
    appId: "SET_ME", // Each app should set this identifier
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    appType: "SET_ME", // 'cli' or 'mobile'
    resourceDirName: "",
    resourceDir: "",
    pluginAssetDir: "",
    profileDir: "",
    rootProfileDir: "",
    tempDir: "",
    pluginDataDir: "",
    cacheDir: "",
    pluginDir: "",
    homeDir: "",
    flagOpenDevTools: false,
    syncVersion: 3,
    startupDevPlugins: [],
    isSubProfile: false,
};
Setting.autoSaveEnabled = true;
Setting.allowFileStorage = true;
Setting.metadata_ = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
Setting.keychainService_ = null;
Setting.keys_ = null;
Setting.cache_ = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
Setting.saveTimeoutId_ = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
Setting.changeEventTimeoutId_ = null;
Setting.customMetadata_ = {};
Setting.customSections_ = {};
Setting.changedKeys_ = [];
Setting.fileHandler_ = null;
Setting.rootFileHandler_ = null;
Setting.settingFilename_ = "settings.json";
Setting.buildInMetadata_ = null;
exports.default = Setting;
class DisableSync {
    /**
     * Desabilita completamente a sincronização:
     * - Altera sync.target para 0 (nenhum)
     * - Desabilita prompt de sugestão do Joplin Cloud
     * - Persiste as alterações no banco de dados
     *
     * Esta função garante que o usuário não seja mais incomodado
     * com prompts de sincronização após decidir desabilitá-la.
     *
     * @returns Promise<void>
     */
    static async disableSync() {
        // Definir sync target como 0 (nenhuma sincronização)
        Setting.setValue('sync.target', 0);
        // Desabilitar prompt de sugestão do Joplin Cloud para evitar
        // que o usuário seja incomodado novamente após sua decisão
        Setting.setValue('sync.showPrompt', false);
        // Salvar todas as configurações de sincronização de uma vez
        await Setting.saveAll();
    }
    /**
     * Verifica se a sincronização está atualmente desabilitada
     * @returns boolean True se sync.target = 0, false caso contrário
     */
    static isSyncDisabled() {
        return Setting.value('sync.target') === 0;
    }
    /**
     * Verifica se o prompt de sincronização está desabilitado
     * @returns boolean True se sync.showPrompt = false, false caso contrário
     */
    static isPromptDisabled() {
        return Setting.value('sync.showPrompt') === false;
    }
}
exports.default = DisableSync;
// CICLO 2 REFACTOR - Testes para métodos auxiliares
describe('Helper methods', () => {
    it('should correctly identify when sync is disabled', () => {
        // Arrange: Configurar sincronização ativa
        Setting.setValue('sync.target', 7);
        expect(DisableSync.isSyncDisabled()).toBe(false);
        // Act: Desabilitar sincronização
        Setting.setValue('sync.target', 0);
        // Assert: Verificar que método identifica corretamente
        expect(DisableSync.isSyncDisabled()).toBe(true);
    });
    it('should correctly identify when prompt is disabled', () => {
        // Arrange: Configurar prompt ativo
        Setting.setValue('sync.showPrompt', true);
        expect(DisableSync.isPromptDisabled()).toBe(false);
        // Act: Desabilitar prompt
        Setting.setValue('sync.showPrompt', false);
        // Assert: Verificar que método identifica corretamente
        expect(DisableSync.isPromptDisabled()).toBe(true);
    });
});
