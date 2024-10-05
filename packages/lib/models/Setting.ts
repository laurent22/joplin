import shim from '../shim';
import { _ } from '../locale';
import eventManager, { EventName } from '../eventManager';
import BaseModel from '../BaseModel';
import Database from '../database';
import FileHandler, { SettingValues } from './settings/FileHandler';
import Logger from '@joplin/utils/Logger';
import mergeGlobalAndLocalSettings from '../services/profileConfig/mergeGlobalAndLocalSettings';
import splitGlobalAndLocalSettings from '../services/profileConfig/splitGlobalAndLocalSettings';
import JoplinError from '../JoplinError';
import builtInMetadata, { BuiltInMetadataKeys, BuiltInMetadataValues } from './settings/builtInMetadata';
import { toSystemSlashes } from '@joplin/utils/path';
import { AppType, Env, SettingItem, SettingItemType, SettingItems, SettingSection, SettingSectionSource, SettingStorage, SettingsRecord } from './settings/types';
const { sprintf } = require('sprintf-js');

const logger = Logger.create('models/Setting');

export * from './settings/types';

export type SettingValueType<T extends string> = (
	T extends BuiltInMetadataKeys
		? BuiltInMetadataValues[T]
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Partial refactor of old code before rule was applied
		: (T extends keyof Constants ? Constants[T] : any)
);

interface OptionsToValueLabelsOptions {
	valueKey: string;
	labelKey: string;
}

interface KeysOptions {
	secureOnly?: boolean;
}

// This is where the actual setting values are stored.
// They are saved to database at regular intervals.
interface CacheItem {
	key: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	value: any;
}

export interface Constants {
	env: Env;
	isDemo: boolean;
	appName: string;
	appId: string;
	appType: AppType;
	resourceDirName: string;
	resourceDir: string;
	profileDir: string;
	rootProfileDir: string;
	tempDir: string;
	pluginDataDir: string;
	cacheDir: string;
	pluginDir: string;
	homeDir: string;
	flagOpenDevTools: boolean;
	syncVersion: number;
	startupDevPlugins: string[];
	isSubProfile: boolean;
}

interface SettingSections {
	[key: string]: SettingSection;
}

// "Default migrations" are used to migrate previous setting defaults to new
// values. If we simply change the default in the metadata, it might cause
// problems if the user has never previously set the value.
//
// It happened for example when changing the "sync.target" from 7 (Dropbox) to 0
// (None). Users who had never explicitly set the sync target and were using
// Dropbox would suddenly have their sync target set to "none".
//
// So the technique is like this:
//
// - If the app has previously been executed, we run the migrations, which do
//   something like this:
//     - If the setting has never been set, set it to the previous default
//       value. For example, for sync.target, it would set it to "7".
//     - If the setting has been explicitly set, keep the current value.
// - If the app runs for the first time, skip all the migrations. So
//   "sync.target" would be set to 0.
//
// A default migration runs only once (or never, if it is skipped).
//
// The handlers to either apply or skip the migrations must be called from the
// application, in the initialization code.

interface DefaultMigration {
	name: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	previousDefault: any;
}

// To create a default migration:
//
// - Set the new default value in the setting metadata
// - Add an entry below with the name of the setting and the **previous**
//   default value.
//
// **Never** removes an item from this array, as the array index is essentially
// the migration ID.

const defaultMigrations: DefaultMigration[] = [
	{
		name: 'sync.target',
		previousDefault: 7,
	},
	{
		name: 'style.editor.contentMaxWidth',
		previousDefault: 600,
	},
	{
		name: 'themeAutoDetect',
		previousDefault: false,
	},
];

// "UserSettingMigration" are used to migrate existing user setting to a new setting. With a way
// to transform existing value of the old setting to value and type of the new setting.
interface UserSettingMigration {
	oldName: string;
	newName: string;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	transformValue: Function;
}

const userSettingMigration: UserSettingMigration[] = [
	{
		oldName: 'spellChecker.language',
		newName: 'spellChecker.languages',
		transformValue: (value: string) => { return [value]; },
	},
];

export type SettingMetadataSection = {
	name: string;
	isScreen?: boolean;
	metadatas: SettingItem[];

	source?: SettingSectionSource;
};
export type MetadataBySection = SettingMetadataSection[];

class Setting extends BaseModel {
	public static schemaUrl = 'https://joplinapp.org/schema/settings.json';

	// For backward compatibility
	public static TYPE_INT = SettingItemType.Int;
	public static TYPE_STRING = SettingItemType.String;
	public static TYPE_BOOL = SettingItemType.Bool;
	public static TYPE_ARRAY = SettingItemType.Array;
	public static TYPE_OBJECT = SettingItemType.Object;
	public static TYPE_BUTTON = SettingItemType.Button;

	public static THEME_LIGHT = 1;
	public static THEME_DARK = 2;
	public static THEME_OLED_DARK = 22;
	public static THEME_SOLARIZED_LIGHT = 3;
	public static THEME_SOLARIZED_DARK = 4;
	public static THEME_DRACULA = 5;
	public static THEME_NORD = 6;
	public static THEME_ARITIM_DARK = 7;

	public static FONT_DEFAULT = 0;
	public static FONT_MENLO = 1;
	public static FONT_COURIER_NEW = 2;
	public static FONT_AVENIR = 3;
	public static FONT_MONOSPACE = 4;

	public static LAYOUT_ALL = 0;
	public static LAYOUT_EDITOR_VIEWER = 1;
	public static LAYOUT_EDITOR_SPLIT = 2;
	public static LAYOUT_VIEWER_SPLIT = 3;

	public static DATE_FORMAT_1 = 'DD/MM/YYYY';
	public static DATE_FORMAT_2 = 'DD/MM/YY';
	public static DATE_FORMAT_3 = 'MM/DD/YYYY';
	public static DATE_FORMAT_4 = 'MM/DD/YY';
	public static DATE_FORMAT_5 = 'YYYY-MM-DD';
	public static DATE_FORMAT_6 = 'DD.MM.YYYY';
	public static DATE_FORMAT_7 = 'YYYY.MM.DD';
	public static DATE_FORMAT_8 = 'YYMMDD';
	public static DATE_FORMAT_9 = 'YYYY/MM/DD';

	public static TIME_FORMAT_1 = 'HH:mm';
	public static TIME_FORMAT_2 = 'h:mm A';
	public static TIME_FORMAT_3 = 'HH.mm';

	public static SHOULD_REENCRYPT_NO = 0; // Data doesn't need to be re-encrypted
	public static SHOULD_REENCRYPT_YES = 1; // Data should be re-encrypted
	public static SHOULD_REENCRYPT_NOTIFIED = 2; // Data should be re-encrypted, and user has been notified

	public static SYNC_UPGRADE_STATE_IDLE = 0; // Doesn't need to be upgraded
	public static SYNC_UPGRADE_STATE_SHOULD_DO = 1; // Should be upgraded, but waiting for user to confirm
	public static SYNC_UPGRADE_STATE_MUST_DO = 2; // Must be upgraded - on next restart, the upgrade will start

	public static customCssFilenames = {
		JOPLIN_APP: 'userchrome.css',
		RENDERED_MARKDOWN: 'userstyle.css',
	};

	// Contains constants that are set by the application and
	// cannot be modified by the user:
	public static constants_: Constants = {
		env: Env.Undefined,
		isDemo: false,
		appName: 'joplin',
		appId: 'SET_ME', // Each app should set this identifier
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		appType: 'SET_ME' as any, // 'cli' or 'mobile'
		resourceDirName: '',
		resourceDir: '',
		profileDir: '',
		rootProfileDir: '',
		tempDir: '',
		pluginDataDir: '',
		cacheDir: '',
		pluginDir: '',
		homeDir: '',
		flagOpenDevTools: false,
		syncVersion: 3,
		startupDevPlugins: [],
		isSubProfile: false,
	};

	public static autoSaveEnabled = true;
	public static allowFileStorage = true;

	private static metadata_: SettingItems = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private static keychainService_: any = null;
	private static keys_: string[] = null;
	private static cache_: CacheItem[] = [];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private static saveTimeoutId_: any = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private static changeEventTimeoutId_: any = null;
	private static customMetadata_: SettingItems = {};
	private static customSections_: SettingSections = {};
	private static changedKeys_: string[] = [];
	private static fileHandler_: FileHandler = null;
	private static rootFileHandler_: FileHandler = null;
	private static settingFilename_ = 'settings.json';
	private static buildInMetadata_: SettingItems = null;

	public static tableName() {
		return 'settings';
	}

	public static modelType() {
		return BaseModel.TYPE_SETTING;
	}

	public static async reset() {
		if (this.saveTimeoutId_) shim.clearTimeout(this.saveTimeoutId_);
		if (this.changeEventTimeoutId_) shim.clearTimeout(this.changeEventTimeoutId_);

		this.saveTimeoutId_ = null;
		this.changeEventTimeoutId_ = null;
		this.metadata_ = null;
		this.keys_ = null;
		this.cache_ = [];
		this.customMetadata_ = {};
		this.fileHandler_ = null;
		this.rootFileHandler_ = null;
	}

	public static get settingFilePath(): string {
		return `${this.value('profileDir')}/${this.settingFilename_}`;
	}

	public static get rootSettingFilePath(): string {
		return `${this.value('rootProfileDir')}/${this.settingFilename_}`;
	}

	public static get settingFilename(): string {
		return this.settingFilename_;
	}

	public static set settingFilename(v: string) {
		this.settingFilename_ = v;
	}

	public static get fileHandler(): FileHandler {
		if (!this.fileHandler_) {
			this.fileHandler_ = new FileHandler(this.settingFilePath);
		}
		return this.fileHandler_;
	}

	public static get rootFileHandler(): FileHandler {
		if (!this.rootFileHandler_) {
			this.rootFileHandler_ = new FileHandler(this.rootSettingFilePath);
		}
		return this.rootFileHandler_;
	}

	public static keychainService() {
		if (!this.keychainService_) throw new Error('keychainService has not been set!!');
		return this.keychainService_;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static setKeychainService(s: any) {
		this.keychainService_ = s;
	}

	public static metadata(): SettingItems {
		if (this.metadata_) return this.metadata_;

		this.buildInMetadata_ = builtInMetadata(this);

		this.metadata_ = { ...this.buildInMetadata_ };

		this.metadata_ = { ...this.metadata_, ...this.customMetadata_ };

		if (this.constants_.env === Env.Dev) this.validateMetadata(this.metadata_);

		return this.metadata_;
	}

	private static validateMetadata(md: SettingItems) {
		for (const [k, v] of Object.entries(md)) {
			if (v.isGlobal && v.storage !== SettingStorage.File) throw new Error(`Setting "${k}" is global but storage is not "file"`);
		}
	}

	public static isBuiltinKey(key: string): boolean {
		return key in this.buildInMetadata_;
	}

	public static customCssFilePath(filename: string): string {
		return `${this.value('rootProfileDir')}/${filename}`;
	}

	public static skipDefaultMigrations() {
		logger.info('Skipping all default migrations...');

		this.setValue('lastSettingDefaultMigration', defaultMigrations.length - 1);
	}

	public static applyDefaultMigrations() {
		logger.info('Applying default migrations...');
		const lastSettingDefaultMigration: number = this.value('lastSettingDefaultMigration');

		for (let i = 0; i < defaultMigrations.length; i++) {
			if (i <= lastSettingDefaultMigration) continue;

			const migration = defaultMigrations[i];

			logger.info(`Applying default migration: ${migration.name}`);

			if (this.isSet(migration.name)) {
				logger.info('Skipping because value is already set');
				continue;
			} else {
				logger.info(`Applying previous default: ${migration.previousDefault}`);
				this.setValue(migration.name, migration.previousDefault);
			}
		}

		this.setValue('lastSettingDefaultMigration', defaultMigrations.length - 1);
	}

	public static applyUserSettingMigration() {
		// Function to translate existing user settings to new setting.
		// eslint-disable-next-line github/array-foreach -- Old code before rule was applied
		userSettingMigration.forEach(userMigration => {
			if (!this.isSet(userMigration.newName) && this.isSet(userMigration.oldName)) {
				this.setValue(userMigration.newName, userMigration.transformValue(this.value(userMigration.oldName)));
				logger.info(`Migrating ${userMigration.oldName} to ${userMigration.newName}`);
			}
		});
	}

	public static featureFlagKeys(appType: AppType): string[] {
		const keys = this.keys(false, appType);
		return keys.filter(k => k.indexOf('featureFlag.') === 0);
	}

	private static validateKey(key: string) {
		if (!key) throw new Error('Cannot register empty key');
		if (key.length > 128) throw new Error(`Key length cannot be longer than 128 characters: ${key}`);
		if (!key.match(/^[a-zA-Z0-9_\-.]+$/)) throw new Error(`Key must only contain characters /a-zA-Z0-9_-./ : ${key}`);
	}

	private static validateType(type: SettingItemType) {
		if (!Number.isInteger(type)) throw new Error(`Setting type is not an integer: ${type}`);
		if (type < 0) throw new Error(`Invalid setting type: ${type}`);
	}

	public static async registerSetting(key: string, metadataItem: SettingItem) {
		try {
			if (metadataItem.isEnum && !metadataItem.options) throw new Error('The `options` property is required for enum types');

			this.validateKey(key);
			this.validateType(metadataItem.type);

			this.customMetadata_[key] = {
				...metadataItem,
				value: this.formatValue(metadataItem.type, metadataItem.value),
			};

			// Clear cache
			this.metadata_ = null;
			this.keys_ = null;

			// Reload the value from the database, if it was already present
			const valueRow = await this.loadOne(key);
			if (valueRow) {
				// Remove any duplicate copies of the setting -- if multiple items in cache_
				// have the same key, we may encounter unique key errors while saving to the
				// database.
				this.cache_ = this.cache_.filter(setting => setting.key !== key);

				this.cache_.push({
					key: key,
					value: this.formatValue(key, valueRow.value),
				});
			}

			this.dispatch({
				type: 'SETTING_UPDATE_ONE',
				key: key,
				value: this.value(key),
			});
		} catch (error) {
			error.message = `Could not register setting "${key}": ${error.message}`;
			throw error;
		}
	}

	public static async registerSection(name: string, source: SettingSectionSource, section: SettingSection) {
		this.customSections_[name] = { ...section, name: name, source: source };
	}

	public static settingMetadata(key: string): SettingItem {
		const metadata = this.metadata();
		if (!(key in metadata)) throw new JoplinError(`Unknown key: ${key}`, 'unknown_key');
		const output = { ...metadata[key] };
		output.key = key;
		return output;
	}

	// Resets the key to its default value.
	public static resetKey(key: string) {
		const md = this.settingMetadata(key);
		this.setValue(key, md.value);
	}

	public static keyExists(key: string) {
		return key in this.metadata();
	}

	public static isSet(key: string) {
		return !!this.cache_.find(d => d.key === key);
	}

	public static keyDescription(key: string, appType: AppType = null) {
		const md = this.settingMetadata(key);
		if (!md.description) return null;
		return md.description(appType);
	}

	public static isSecureKey(key: string) {
		return this.metadata()[key] && this.metadata()[key].secure === true;
	}

	public static keys(publicOnly = false, appType: AppType = null, options: KeysOptions = null) {
		options = { secureOnly: false, ...options };

		if (!this.keys_) {
			const metadata = this.metadata();
			this.keys_ = [];
			for (const n in metadata) {
				if (!metadata.hasOwnProperty(n)) continue;
				this.keys_.push(n);
			}
		}

		if (appType || publicOnly || options.secureOnly) {
			const output = [];
			for (let i = 0; i < this.keys_.length; i++) {
				const md = this.settingMetadata(this.keys_[i]);
				if (publicOnly && !md.public) continue;
				if (appType && md.appTypes && md.appTypes.indexOf(appType) < 0) continue;
				if (options.secureOnly && !md.secure) continue;
				output.push(md.key);
			}
			return output;
		} else {
			return this.keys_;
		}
	}

	public static isPublic(key: string) {
		return this.keys(true).indexOf(key) >= 0;
	}

	// Low-level method to load a setting directly from the database. Should not be used in most cases.
	// Does not apply setting default values.
	public static async loadOne(key: string): Promise<CacheItem | null> {
		if (this.keyStorage(key) === SettingStorage.File) {
			let fileSettings = await this.fileHandler.load();

			const md = this.settingMetadata(key);
			if (md.isGlobal) {
				const rootFileSettings = await this.rootFileHandler.load();
				fileSettings = mergeGlobalAndLocalSettings(rootFileSettings, fileSettings);
			}

			if (key in fileSettings) {
				return {
					key,
					value: fileSettings[key],
				};
			} else {
				return null;
			}
		}

		// Always check in the database first, including for secure settings,
		// because that's where they would be if the keychain is not enabled (or
		// if writing to the keychain previously failed).
		//
		// https://github.com/laurent22/joplin/issues/5720
		const row = await this.modelSelectOne('SELECT * FROM settings WHERE key = ?', [key]);
		if (row) return row;

		if (this.settingMetadata(key).secure) {
			return {
				key,
				value: await this.keychainService().password(`setting.${key}`),
			};
		}

		return null;
	}

	public static async load() {
		this.cancelScheduleSave();
		this.cancelScheduleChangeEvent();

		this.cache_ = [];
		const rows: CacheItem[] = await this.modelSelectAll('SELECT * FROM settings');


		// Keys in the database takes precedence over keys in the keychain because
		// they are more likely to be up to date (saving to keychain can fail, but
		// saving to database shouldn't). When the keychain works, the secure keys
		// are deleted from the database and transferred to the keychain in saveAll().

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const rowKeys = rows.map((r: any) => r.key);
		const secureKeys = this.keys(false, null, { secureOnly: true });
		const secureItems: CacheItem[] = [];
		for (const key of secureKeys) {
			if (rowKeys.includes(key)) continue;

			const password = await this.keychainService().password(`setting.${key}`);
			if (password) {
				secureItems.push({
					key: key,
					value: password,
				});
			}
		}

		const itemsFromFile: CacheItem[] = [];

		if (this.canUseFileStorage()) {
			let fileSettings = await this.fileHandler.load();

			if (this.value('isSubProfile')) {
				const rootFileSettings = await this.rootFileHandler.load();
				fileSettings = mergeGlobalAndLocalSettings(rootFileSettings, fileSettings);
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
		const pushItemsToCache = (items: CacheItem[]) => {
			for (let i = 0; i < items.length; i++) {
				const c = items[i];

				// Avoid duplicating keys -- doing so causes save issues.
				if (cachedKeys.has(c.key)) continue;
				if (!this.keyExists(c.key)) continue;

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

	private static canUseFileStorage(): boolean {
		return this.allowFileStorage && !shim.mobilePlatform();
	}

	private static keyStorage(key: string): SettingStorage {
		if (!this.canUseFileStorage()) return SettingStorage.Database;
		const md = this.settingMetadata(key);
		return md.storage || SettingStorage.Database;
	}

	public static toPlainObject() {
		const keys = this.keys();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const keyToValues: any = {};
		for (let i = 0; i < keys.length; i++) {
			keyToValues[keys[i]] = this.value(keys[i]);
		}
		return keyToValues;
	}

	public static dispatchUpdateAll() {
		this.dispatch({
			type: 'SETTING_UPDATE_ALL',
			settings: this.toPlainObject(),
		});
	}

	public static setConstant<T extends keyof Constants>(key: T, value: Constants[T]) {
		if (!(key in this.constants_)) throw new Error(`Unknown constant key: ${key}`);
		this.constants_[key] = value;
	}

	public static setValue<T extends string>(key: T, value: SettingValueType<T>) {
		if (!this.cache_) throw new Error('Settings have not been initialized!');

		value = this.formatValue(key, value);
		value = this.filterValue(key, value);

		for (let i = 0; i < this.cache_.length; i++) {
			const c = this.cache_[i];
			if (c.key === key) {
				const md = this.settingMetadata(key);

				if (md.isEnum === true) {
					if (!this.isAllowedEnumOption(key, value)) {
						throw new Error(_('Invalid option value: "%s". Possible values are: %s.', value, this.enumOptionsDoc(key)));
					}
				}

				if (c.value === value) return;

				this.changedKeys_.push(key);

				// Don't log this to prevent sensitive info (passwords, auth tokens...) to end up in logs
				// logger.info('Setting: ' + key + ' = ' + c.value + ' => ' + value);

				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Partial refactor of old code before rule was applied
				if ('minimum' in md && value < md.minimum) value = md.minimum as any;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Partial refactor of old code before rule was applied
				if ('maximum' in md && value > md.maximum) value = md.maximum as any;

				c.value = value;

				this.dispatch({
					type: 'SETTING_UPDATE_ONE',
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
			type: 'SETTING_UPDATE_ONE',
			key: key,
			value: this.formatValue(key, value),
		});

		this.changedKeys_.push(key);

		this.scheduleSave();
		this.scheduleChangeEvent();
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static incValue(key: string, inc: any) {
		return this.setValue(key, this.value(key) + inc);
	}

	public static toggle(key: string) {
		return this.setValue(key, !this.value(key));
	}

	// this method checks if the 'value' passed is present in the Setting "Array"
	// If yes, then it just returns 'true'. If its not present then, it will
	// update it and return 'false'
	public static setArrayValue(settingName: string, value: string): boolean {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const settingValue: any[] = this.value(settingName);
		if (settingValue.includes(value)) return true;
		settingValue.push(value);
		this.setValue(settingName, settingValue);
		return false;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static objectValue(settingKey: string, objectKey: string, defaultValue: any = null) {
		const o = this.value(settingKey);
		if (!o || !(objectKey in o)) return defaultValue;
		return o[objectKey];
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static setObjectValue(settingKey: string, objectKey: string, value: any) {
		let o = this.value(settingKey);
		if (typeof o !== 'object') o = {};
		o[objectKey] = value;
		this.setValue(settingKey, o);
	}

	public static deleteObjectValue(settingKey: string, objectKey: string) {
		const o = this.value(settingKey);
		if (typeof o !== 'object') return;
		delete o[objectKey];
		this.setValue(settingKey, o);
	}

	public static async deleteKeychainPasswords() {
		const secureKeys = this.keys(false, null, { secureOnly: true });
		for (const key of secureKeys) {
			await this.keychainService().deletePassword(`setting.${key}`);
		}
	}

	public static enumOptionsToValueLabels(enumOptions: Record<string, string>, order: string[], options: OptionsToValueLabelsOptions = null) {
		options = {
			labelKey: 'label',
			valueKey: 'value',
			...options,
		};

		const output = [];

		for (const value of order) {
			if (!Object.prototype.hasOwnProperty.call(enumOptions, value)) continue;

			output.push({
				[options.valueKey]: value,
				[options.labelKey]: enumOptions[value],
			});
		}

		for (const k in enumOptions) {
			if (!Object.prototype.hasOwnProperty.call(enumOptions, k)) continue;
			if (order.includes(k)) continue;

			output.push({
				[options.valueKey]: k,
				[options.labelKey]: enumOptions[k],
			});
		}

		return output;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static valueToString(key: string, value: any) {
		const md = this.settingMetadata(key);
		value = this.formatValue(key, value);
		if (md.type === SettingItemType.Int) return value.toFixed(0);
		if (md.type === SettingItemType.Bool) return value ? '1' : '0';
		if (md.type === SettingItemType.Array) return value ? JSON.stringify(value) : '[]';
		if (md.type === SettingItemType.Object) return value ? JSON.stringify(value) : '{}';
		if (md.type === SettingItemType.String) return value ? `${value}` : '';

		throw new Error(`Unhandled value type: ${md.type}`);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static filterValue(key: string, value: any) {
		const md = this.settingMetadata(key);
		return md.filter ? md.filter(value) : value;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static formatValue(key: string | SettingItemType, value: any) {
		const type = typeof key === 'string' ? this.settingMetadata(key).type : key;

		if (type === SettingItemType.Int) return !value ? 0 : Math.floor(Number(value));

		if (type === SettingItemType.Bool) {
			if (typeof value === 'string') {
				value = value.toLowerCase();
				if (value === 'true') return true;
				if (value === 'false') return false;
				value = Number(value);
			}
			return !!value;
		}

		if (type === SettingItemType.Array) {
			if (!value) return [];
			if (Array.isArray(value)) return value;
			if (typeof value === 'string') return JSON.parse(value);
			return [];
		}

		if (type === SettingItemType.Object) {
			if (!value) return {};
			if (typeof value === 'object') return value;
			if (typeof value === 'string') return JSON.parse(value);
			return {};
		}

		if (type === SettingItemType.String) {
			if (!value) return '';
			return `${value}`;
		}

		throw new Error(`Unhandled value type: ${type}`);
	}

	public static value<T extends string>(key: T): SettingValueType<T> {
		// Need to copy arrays and objects since in setValue(), the old value and new one is compared
		// with strict equality and the value is updated only if changed. However if the caller acquire
		// an object and change a key, the objects will be detected as equal. By returning a copy
		// we avoid this problem.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		function copyIfNeeded(value: any) {
			if (value === null || value === undefined) return value;
			if (Array.isArray(value)) return value.slice();
			if (typeof value === 'object') return { ...value };
			return value;
		}

		if (key in this.constants_) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const v = (this.constants_ as any)[key];
			const output = typeof v === 'function' ? v() : v;
			if (output === 'SET_ME') throw new Error(`SET_ME constant has not been set: ${key}`);
			return output;
		}

		if (!this.cache_) throw new Error('Settings have not been initialized!');

		for (let i = 0; i < this.cache_.length; i++) {
			if (this.cache_[i].key === key) {
				return copyIfNeeded(this.cache_[i].value);
			}
		}

		const md = this.settingMetadata(key);
		return copyIfNeeded(md.value);
	}

	// This function returns the default value if the setting key does not exist.
	public static valueNoThrow<T extends string>(key: T, defaultValue: SettingValueType<T>): SettingValueType<T> {
		if (!this.keyExists(key)) return defaultValue;
		return this.value(key);
	}

	public static isEnum(key: string) {
		const md = this.settingMetadata(key);
		return md.isEnum === true;
	}

	public static enumOptionValues(key: string) {
		const options = this.enumOptions(key);
		const output = [];
		for (const n in options) {
			if (!options.hasOwnProperty(n)) continue;
			output.push(n);
		}
		return output;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static enumOptionLabel(key: string, value: any) {
		const options = this.enumOptions(key);
		for (const n in options) {
			if (n === value) return options[n];
		}
		return '';
	}

	public static enumOptions(key: string) {
		const metadata = this.metadata();
		if (!metadata[key]) throw new JoplinError(`Unknown key: ${key}`, 'unknown_key');
		if (!metadata[key].options) throw new Error(`No options for: ${key}`);
		return metadata[key].options();
	}

	public static enumOptionsDoc(key: string, templateString: string = null) {
		if (templateString === null) templateString = '%s: %s';
		const options = this.enumOptions(key);
		const output = [];
		for (const n in options) {
			if (!options.hasOwnProperty(n)) continue;
			output.push(sprintf(templateString, n, options[n]));
		}
		return output.join(', ');
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static isAllowedEnumOption(key: string, value: any) {
		const options = this.enumOptions(key);
		return !!options[value];
	}

	// For example, if settings is:
	// { sync.5.path: 'http://example', sync.5.username: 'testing' }
	// and baseKey is 'sync.5', the function will return
	// { path: 'http://example', username: 'testing' }
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static subValues(baseKey: string, settings: Partial<SettingsRecord>, options: any = null) {
		const includeBaseKeyInName = !!options && !!options.includeBaseKeyInName;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const output: any = {};
		for (const key in settings) {
			if (!settings.hasOwnProperty(key)) continue;
			if (key.indexOf(baseKey) === 0) {
				const subKey = includeBaseKeyInName ? key : key.substr(baseKey.length + 1);
				output[subKey] = settings[key];
			}
		}
		return output;
	}

	public static async saveAll() {
		if (Setting.autoSaveEnabled && !this.saveTimeoutId_) return Promise.resolve();

		logger.debug('Saving settings...');
		shim.clearTimeout(this.saveTimeoutId_);
		this.saveTimeoutId_ = null;

		const keys = this.keys();

		const valuesForFile: SettingValues = {};
		for (const key of keys) {
			// undefined => Delete from settings JSON file.
			valuesForFile[key] = undefined;
		}

		const queries = [];
		queries.push(`DELETE FROM settings WHERE key IN ('${keys.join('\',\'')}')`);

		for (let i = 0; i < this.cache_.length; i++) {
			const s = { ...this.cache_[i] };
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
					if (wasSet) continue;
				} catch (error) {
					logger.error(`Could not set setting on the keychain. Will be saved to database instead: ${s.key}:`, error);
				}
			}

			if (this.keyStorage(s.key) === SettingStorage.File) {
				valuesForFile[s.key] = s.value;
			} else {
				queries.push(Database.insertQuery(this.tableName(), {
					key: s.key,
					value: valueAsString,
				}));
			}
		}

		await BaseModel.db().transactionExecBatch(queries);

		if (this.canUseFileStorage()) {
			if (this.value('isSubProfile')) {
				const { globalSettings, localSettings } = splitGlobalAndLocalSettings(valuesForFile);
				const currentGlobalSettings = await this.rootFileHandler.load();

				// When saving to the root setting file, we preserve the
				// existing settings, which are specific to the root profile,
				// and add the global settings.

				await this.rootFileHandler.save({
					...currentGlobalSettings,
					...globalSettings,
				});

				await this.fileHandler.save(localSettings);
			} else {
				await this.fileHandler.save(valuesForFile);
			}
		}

		logger.debug('Settings have been saved.');
	}

	public static scheduleChangeEvent() {
		if (this.changeEventTimeoutId_) shim.clearTimeout(this.changeEventTimeoutId_);

		this.changeEventTimeoutId_ = shim.setTimeout(() => {
			this.emitScheduledChangeEvent();
		}, 1000);
	}

	public static cancelScheduleChangeEvent() {
		if (this.changeEventTimeoutId_) shim.clearTimeout(this.changeEventTimeoutId_);
		this.changeEventTimeoutId_ = null;
	}

	public static emitScheduledChangeEvent() {
		if (!this.changeEventTimeoutId_) return;

		shim.clearTimeout(this.changeEventTimeoutId_);
		this.changeEventTimeoutId_ = null;

		if (!this.changedKeys_.length) {
			// Sanity check - shouldn't happen
			logger.warn('Trying to dispatch a change event without any changed keys');
			return;
		}

		const keys = this.changedKeys_.slice();
		this.changedKeys_ = [];
		eventManager.emit(EventName.SettingsChange, { keys });
	}

	public static scheduleSave() {
		if (!Setting.autoSaveEnabled) return;

		if (this.saveTimeoutId_) shim.clearTimeout(this.saveTimeoutId_);

		this.saveTimeoutId_ = shim.setTimeout(async () => {
			try {
				await this.saveAll();
			} catch (error) {
				logger.error('Could not save settings', error);
			}
		}, 500);
	}

	public static cancelScheduleSave() {
		if (this.saveTimeoutId_) shim.clearTimeout(this.saveTimeoutId_);
		this.saveTimeoutId_ = null;
	}

	public static publicSettings(appType: AppType) {
		if (!appType) throw new Error('appType is required');

		const metadata = this.metadata();

		const output: Partial<SettingsRecord> = {};
		for (const key in metadata) {
			if (!metadata.hasOwnProperty(key)) continue;
			const s = { ...metadata[key] };
			if (!s.public) continue;
			if (s.appTypes && s.appTypes.indexOf(appType) < 0) continue;
			s.value = this.value(key);
			output[key] = s;
		}
		return output as SettingsRecord;
	}

	public static typeToString(typeId: SettingItemType) {
		if (typeId === SettingItemType.Int) return 'int';
		if (typeId === SettingItemType.String) return 'string';
		if (typeId === SettingItemType.Bool) return 'bool';
		if (typeId === SettingItemType.Array) return 'array';
		if (typeId === SettingItemType.Object) return 'object';
		throw new Error(`Invalid type ID: ${typeId}`);
	}

	public static sectionOrder() {
		return [
			'general',
			'application',
			'appearance',
			'sync',
			'encryption',
			'joplinCloud',
			'plugins',
			'markdownPlugins',
			'note',
			'revisionService',
			'server',
			'keymap',
			'tools',
			'importOrExport',
			'moreInfo',
		];
	}

	private static sectionSource(sectionName: string): SettingSectionSource {
		if (this.customSections_[sectionName]) return this.customSections_[sectionName].source || SettingSectionSource.Default;
		return SettingSectionSource.Default;
	}

	public static isSubSection(sectionName: string) {
		return ['encryption', 'application', 'appearance', 'joplinCloud'].includes(sectionName);
	}

	public static groupMetadatasBySections(metadatas: SettingItem[]): MetadataBySection {
		const sections = [];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const generalSection: any = { name: 'general', metadatas: [] };
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const nameToSections: any = {};
		nameToSections['general'] = generalSection;
		sections.push(generalSection);
		for (let i = 0; i < metadatas.length; i++) {
			const md = metadatas[i];
			if (!md.section) {
				generalSection.metadatas.push(md);
			} else {
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

	public static sectionNameToLabel(name: string) {
		if (name === 'general') return _('General');
		if (name === 'sync') return _('Synchronisation');
		if (name === 'appearance') return _('Appearance');
		if (name === 'note') return _('Note');
		if (name === 'folder') return _('Notebook');
		if (name === 'markdownPlugins') return _('Markdown');
		if (name === 'plugins') return _('Plugins');
		if (name === 'application') return _('Application');
		if (name === 'revisionService') return _('Note History');
		if (name === 'encryption') return _('Encryption');
		if (name === 'server') return _('Web Clipper');
		if (name === 'keymap') return _('Keyboard Shortcuts');
		if (name === 'joplinCloud') return _('Joplin Cloud');
		if (name === 'tools') return _('Tools');
		if (name === 'importOrExport') return _('Import and Export');
		if (name === 'moreInfo') return _('More information');

		if (this.customSections_[name] && this.customSections_[name].label) return this.customSections_[name].label;

		return name;
	}

	public static sectionDescription(name: string, appType: AppType) {
		if (name === 'markdownPlugins' && appType === AppType.Desktop) {
			return _('These plugins enhance the Markdown renderer with additional features. Please note that, while these features might be useful, they are not standard Markdown and thus most of them will only work in Joplin. Additionally, some of them are *incompatible* with the WYSIWYG editor. If you open a note that uses one of these plugins in that editor, you will lose the plugin formatting. It is indicated below which plugins are compatible or not with the WYSIWYG editor.');
		}
		if (name === 'general' && appType === AppType.Desktop) {
			return _('Notes and settings are stored in: %s', toSystemSlashes(this.value('profileDir'), process.platform));
		}

		if (this.customSections_[name] && this.customSections_[name].description) return this.customSections_[name].description;

		return '';
	}

	public static sectionMetadataToSummary(metadata: SettingMetadataSection): string {
		// TODO: This is currently specific to the mobile app
		const sectionNameToSummary: Record<string, string> = {
			'general': _('Language, date format'),
			'appearance': _('Themes, editor font'),
			'sync': _('Sync, encryption, proxy'),
			'joplinCloud': _('Email To Note, login information'),
			'markdownPlugins': _('Media player, math, diagrams, table of contents'),
			'note': _('Geolocation, spellcheck, editor toolbar, image resize'),
			'revisionService': _('Toggle note history, keep notes for'),
			'tools': _('Logs, profiles, sync status'),
			'importOrExport': _('Import or export your data'),
			'plugins': _('Enable or disable plugins'),
			'moreInfo': _('Donate, website'),
		};

		// In some cases (e.g. plugin settings pages) there is no preset summary.
		// In those cases, we generate the summary:
		const generateSummary = () => {
			const summary = [];
			for (const item of metadata.metadatas) {
				if (!item.public || item.advanced) {
					continue;
				}

				if (item.label) {
					const label = item.label?.();
					summary.push(label);
				}
			}

			return summary.join(', ');
		};

		return sectionNameToSummary[metadata.name] ?? generateSummary();
	}

	public static sectionNameToIcon(name: string, appType: AppType) {
		const nameToIconMap: Record<string, string> = {
			'general': 'icon-general',
			'sync': 'icon-sync',
			'appearance': 'icon-appearance',
			'note': 'icon-note',
			'folder': 'icon-notebooks',
			'plugins': 'icon-plugins',
			'markdownPlugins': 'fab fa-markdown',
			'application': 'icon-application',
			'revisionService': 'icon-note-history',
			'encryption': 'icon-encryption',
			'server': 'far fa-hand-scissors',
			'keymap': 'fa fa-keyboard',
			'joplinCloud': 'fa fa-cloud',
			'tools': 'fa fa-toolbox',
			'importOrExport': 'fa fa-file-export',
			'moreInfo': 'fa fa-info-circle',
		};

		// Icomoon icons are currently not present in the mobile app -- we override these
		// below.
		//
		// These icons come from react-native-vector-icons.
		// See https://oblador.github.io/react-native-vector-icons/
		const mobileNameToIconMap: Record<string, string> = {
			'general': 'fa fa-sliders-h',
			'sync': 'fa fa-sync',
			'appearance': 'fa fa-ruler',
			'note': 'fa fa-sticky-note',
			'revisionService': 'far fa-history',
			'plugins': 'fa fa-puzzle-piece',
			'application': 'fa fa-cog',
			'encryption': 'fa fa-key',
		};

		// Overridden?
		if (appType === AppType.Mobile && name in mobileNameToIconMap) {
			return mobileNameToIconMap[name];
		}

		if (name in nameToIconMap) {
			return nameToIconMap[name];
		}

		if (this.customSections_[name] && this.customSections_[name].iconName) return this.customSections_[name].iconName;

		return 'fas fa-cog';
	}

	public static appTypeToLabel(name: string) {
		// Not translated for now because only used on Welcome notes (which are not translated)
		if (name === 'cli') return 'CLI';
		return name[0].toUpperCase() + name.substr(1).toLowerCase();
	}
}

export default Setting;
