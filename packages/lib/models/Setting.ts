import shim from '../shim';
import { _, supportedLocalesToLanguages, defaultLocale } from '../locale';
import eventManager, { EventName } from '../eventManager';
import BaseModel from '../BaseModel';
import Database from '../database';
import SyncTargetRegistry from '../SyncTargetRegistry';
import time from '../time';
import FileHandler, { SettingValues } from './settings/FileHandler';
import Logger from '@joplin/utils/Logger';
import mergeGlobalAndLocalSettings from '../services/profileConfig/mergeGlobalAndLocalSettings';
import splitGlobalAndLocalSettings from '../services/profileConfig/splitGlobalAndLocalSettings';
import JoplinError from '../JoplinError';
import { defaultListColumns } from '../services/plugins/api/noteListType';
const { sprintf } = require('sprintf-js');
const ObjectUtils = require('../ObjectUtils');
const { toTitleCase } = require('../string-utils.js');
const { rtrimSlashes, toSystemSlashes } = require('../path-utils');

const logger = Logger.create('models/Setting');

export enum SettingItemType {
	Int = 1,
	String = 2,
	Bool = 3,
	Array = 4,
	Object = 5,
	Button = 6,
}

interface OptionsToValueLabelsOptions {
	valueKey: string;
	labelKey: string;
}

export enum SettingItemSubType {
	FilePathAndArgs = 'file_path_and_args',
	FilePath = 'file_path', // Not supported on mobile!
	DirectoryPath = 'directory_path', // Not supported on mobile!
	FontFamily = 'font_family',
	MonospaceFontFamily = 'monospace_font_family',
}

interface KeysOptions {
	secureOnly?: boolean;
}

export enum SettingStorage {
	Database = 1,
	File = 2,
}

// This is the definition of a setting item
export interface SettingItem {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	value: any;
	type: SettingItemType;
	public: boolean;

	subType?: string;
	key?: string;
	isEnum?: boolean;
	section?: string;
	label?(): string;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	description?: Function;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	options?(): any;
	optionsOrder?(): string[];
	appTypes?: AppType[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	show?(settings: any): boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	filter?(value: any): any;
	secure?: boolean;
	advanced?: boolean;
	minimum?: number;
	maximum?: number;
	step?: number;
	onClick?(): void;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	unitLabel?: Function;
	needRestart?: boolean;
	autoSave?: boolean;
	storage?: SettingStorage;
	hideLabel?: boolean;

	// In a multi-profile context, all settings are by default local - they take
	// their value from the current profile. This flag can be set to specify
	// that the setting is global and that its value should come from the root
	// profile. This flag only applies to sub-profiles.
	//
	// At the moment, all global settings must be saved to file (have the
	// storage attribute set to "file") because it's simpler to load the root
	// profile settings.json than load the whole SQLite database. This
	// restriction is not an issue normally since all settings that are
	// considered global are also the user-facing ones.
	isGlobal?: boolean;
}

export interface SettingItems {
	[key: string]: SettingItem;
}

// This is where the actual setting values are stored.
// They are saved to database at regular intervals.
interface CacheItem {
	key: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	value: any;
}

export enum SettingSectionSource {
	Default = 1,
	Plugin = 2,
}

export interface SettingSection {
	label: string;
	iconName?: string;
	description?: string;
	name?: string;
	source?: SettingSectionSource;
}

export enum SyncStartupOperation {
	None = 0,
	ClearLocalSyncState = 1,
	ClearLocalData = 2,
}

export enum Env {
	Undefined = 'SET_ME',
	Dev = 'dev',
	Prod = 'prod',
}

export enum AppType {
	Desktop = 'desktop',
	Mobile = 'mobile',
	Cli = 'cli',
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

		const platform = shim.platformName();
		const mobilePlatform = shim.mobilePlatform();

		let wysiwygYes = '';
		let wysiwygNo = '';
		if (shim.isElectron()) {
			wysiwygYes = ` ${_('(wysiwyg: %s)', _('yes'))}`;
			wysiwygNo = ` ${_('(wysiwyg: %s)', _('no'))}`;
		}

		const emptyDirWarning = _('Attention: If you change this location, make sure you copy all your content to it before syncing, otherwise all files will be removed! See the FAQ for more details: %s', 'https://joplinapp.org/help/faq');

		// A "public" setting means that it will show up in the various config screens (or config command for the CLI tool), however
		// if if private a setting might still be handled and modified by the app. For instance, the settings related to sorting notes are not
		// public for the mobile and desktop apps because they are handled separately in menus.

		const themeOptions = () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const output: any = {};
			output[Setting.THEME_LIGHT] = _('Light');
			output[Setting.THEME_DARK] = _('Dark');
			output[Setting.THEME_DRACULA] = _('Dracula');
			output[Setting.THEME_SOLARIZED_LIGHT] = _('Solarised Light');
			output[Setting.THEME_SOLARIZED_DARK] = _('Solarised Dark');
			output[Setting.THEME_NORD] = _('Nord');
			output[Setting.THEME_ARITIM_DARK] = _('Aritim Dark');
			output[Setting.THEME_OLED_DARK] = _('OLED Dark');
			return output;
		};

		this.buildInMetadata_ = {
			'clientId': {
				value: '',
				type: SettingItemType.String,
				public: false,
			},
			'editor.codeView': {
				value: true,
				type: SettingItemType.Bool,
				public: false,
				appTypes: [AppType.Desktop],
				storage: SettingStorage.File,
				isGlobal: true,
			},

			'sync.openSyncWizard': {
				value: null,
				type: SettingItemType.Button,
				public: true,
				appTypes: [AppType.Desktop],
				label: () => _('Open Sync Wizard...'),
				hideLabel: true,
				section: 'sync',
			},

			'sync.target': {
				value: 0,
				type: SettingItemType.Int,
				isEnum: true,
				public: true,
				section: 'sync',
				label: () => _('Synchronisation target'),
				description: (appType: AppType) => {
					return appType !== 'cli' ? null : _('The target to synchronise to. Each sync target may have additional parameters which are named as `sync.NUM.NAME` (all documented below).');
				},
				options: () => {
					return SyncTargetRegistry.idAndLabelPlainObject(platform);
				},
				optionsOrder: () => {
					return SyncTargetRegistry.optionsOrder();
				},
				storage: SettingStorage.File,
			},

			'sync.upgradeState': {
				value: Setting.SYNC_UPGRADE_STATE_IDLE,
				type: SettingItemType.Int,
				public: false,
			},

			'sync.startupOperation': {
				value: SyncStartupOperation.None,
				type: SettingItemType.Int,
				public: false,
			},

			'sync.2.path': {
				value: '',
				type: SettingItemType.String,
				section: 'sync',
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				show: (settings: any) => {
					try {
						return settings['sync.target'] === SyncTargetRegistry.nameToId('filesystem');
					} catch (error) {
						return false;
					}
				},
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				filter: (value: any) => {
					return value ? rtrimSlashes(value) : '';
				},
				public: true,
				label: () => _('Directory to synchronise with (absolute path)'),
				description: () => emptyDirWarning,
				storage: SettingStorage.File,
			},

			'sync.5.path': {
				value: '',
				type: SettingItemType.String,
				section: 'sync',
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				show: (settings: any) => {
					return settings['sync.target'] === SyncTargetRegistry.nameToId('nextcloud');
				},
				public: true,
				label: () => _('Nextcloud WebDAV URL'),
				description: () => emptyDirWarning,
				storage: SettingStorage.File,
			},
			'sync.5.username': {
				value: '',
				type: SettingItemType.String,
				section: 'sync',
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				show: (settings: any) => {
					return settings['sync.target'] === SyncTargetRegistry.nameToId('nextcloud');
				},
				public: true,
				label: () => _('Nextcloud username'),
				storage: SettingStorage.File,
			},
			'sync.5.password': {
				value: '',
				type: SettingItemType.String,
				section: 'sync',
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				show: (settings: any) => {
					return settings['sync.target'] === SyncTargetRegistry.nameToId('nextcloud');
				},
				public: true,
				label: () => _('Nextcloud password'),
				secure: true,
			},

			'sync.6.path': {
				value: '',
				type: SettingItemType.String,
				section: 'sync',
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				show: (settings: any) => {
					return settings['sync.target'] === SyncTargetRegistry.nameToId('webdav');
				},
				public: true,
				label: () => _('WebDAV URL'),
				description: () => emptyDirWarning,
				storage: SettingStorage.File,
			},
			'sync.6.username': {
				value: '',
				type: SettingItemType.String,
				section: 'sync',
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				show: (settings: any) => {
					return settings['sync.target'] === SyncTargetRegistry.nameToId('webdav');
				},
				public: true,
				label: () => _('WebDAV username'),
				storage: SettingStorage.File,
			},
			'sync.6.password': {
				value: '',
				type: SettingItemType.String,
				section: 'sync',
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				show: (settings: any) => {
					return settings['sync.target'] === SyncTargetRegistry.nameToId('webdav');
				},
				public: true,
				label: () => _('WebDAV password'),
				secure: true,
			},

			'sync.8.path': {
				value: '',
				type: SettingItemType.String,
				section: 'sync',
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				show: (settings: any) => {
					try {
						return settings['sync.target'] === SyncTargetRegistry.nameToId('amazon_s3');
					} catch (error) {
						return false;
					}
				},
				filter: value => {
					return value ? rtrimSlashes(value) : '';
				},
				public: true,
				label: () => _('S3 bucket'),
				description: () => emptyDirWarning,
				storage: SettingStorage.File,
			},
			'sync.8.url': {
				value: 'https://s3.amazonaws.com/',
				type: SettingItemType.String,
				section: 'sync',
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				show: (settings: any) => {
					return settings['sync.target'] === SyncTargetRegistry.nameToId('amazon_s3');
				},
				filter: value => {
					return value ? value.trim() : '';
				},
				public: true,
				label: () => _('S3 URL'),
				storage: SettingStorage.File,
			},
			'sync.8.region': {
				value: '',
				type: SettingItemType.String,
				section: 'sync',
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				show: (settings: any) => {
					return settings['sync.target'] === SyncTargetRegistry.nameToId('amazon_s3');
				},
				filter: value => {
					return value ? value.trim() : '';
				},
				public: true,
				label: () => _('S3 region'),
				storage: SettingStorage.File,
			},
			'sync.8.username': {
				value: '',
				type: SettingItemType.String,
				section: 'sync',
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				show: (settings: any) => {
					return settings['sync.target'] === SyncTargetRegistry.nameToId('amazon_s3');
				},
				public: true,
				label: () => _('S3 access key'),
				storage: SettingStorage.File,
			},
			'sync.8.password': {
				value: '',
				type: SettingItemType.String,
				section: 'sync',
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				show: (settings: any) => {
					return settings['sync.target'] === SyncTargetRegistry.nameToId('amazon_s3');
				},
				public: true,
				label: () => _('S3 secret key'),
				secure: true,
			},
			'sync.8.forcePathStyle': {
				value: false,
				type: SettingItemType.Bool,
				section: 'sync',
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				show: (settings: any) => {
					return settings['sync.target'] === SyncTargetRegistry.nameToId('amazon_s3');
				},
				public: true,
				label: () => _('Force path style'),
				storage: SettingStorage.File,
			},
			'sync.9.path': {
				value: '',
				type: SettingItemType.String,
				section: 'sync',
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				show: (settings: any) => {
					return settings['sync.target'] === SyncTargetRegistry.nameToId('joplinServer');
				},
				public: true,
				label: () => _('Joplin Server URL'),
				description: () => emptyDirWarning,
				storage: SettingStorage.File,
			},
			'sync.9.userContentPath': {
				value: '',
				type: SettingItemType.String,
				public: false,
				storage: SettingStorage.Database,
			},
			'sync.9.username': {
				value: '',
				type: SettingItemType.String,
				section: 'sync',
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				show: (settings: any) => {
					return settings['sync.target'] === SyncTargetRegistry.nameToId('joplinServer');
				},
				public: true,
				label: () => _('Joplin Server email'),
				storage: SettingStorage.File,
			},
			'sync.9.password': {
				value: '',
				type: SettingItemType.String,
				section: 'sync',
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				show: (settings: any) => {
					return settings['sync.target'] === SyncTargetRegistry.nameToId('joplinServer');
				},
				public: true,
				label: () => _('Joplin Server password'),
				secure: true,
			},

			// Although sync.10.path is essentially a constant, we still define
			// it here so that both Joplin Server and Joplin Cloud can be
			// handled in the same consistent way. Also having it a setting
			// means it can be set to something else for development.
			'sync.10.path': {
				value: 'https://api.joplincloud.com',
				type: SettingItemType.String,
				public: false,
				storage: SettingStorage.Database,
			},
			'sync.10.userContentPath': {
				value: 'https://joplinusercontent.com',
				type: SettingItemType.String,
				public: false,
				storage: SettingStorage.Database,
			},
			'sync.10.website': {
				value: 'https://joplincloud.com',
				type: SettingItemType.String,
				public: false,
				storage: SettingStorage.Database,
			},
			'sync.10.username': {
				value: '',
				type: SettingItemType.String,
				public: false,
				storage: SettingStorage.File,
			},
			'sync.10.password': {
				value: '',
				type: SettingItemType.String,
				public: false,
				secure: true,
			},

			'sync.10.inboxEmail': { value: '', type: SettingItemType.String, public: false },

			'sync.10.inboxId': { value: '', type: SettingItemType.String, public: false },

			'sync.10.canUseSharePermissions': { value: false, type: SettingItemType.Bool, public: false },

			'sync.10.accountType': { value: 0, type: SettingItemType.Int, public: false },

			'sync.5.syncTargets': { value: {}, type: SettingItemType.Object, public: false },

			'sync.resourceDownloadMode': {
				value: 'always',
				type: SettingItemType.String,
				section: 'sync',
				public: true,
				advanced: true,
				isEnum: true,
				appTypes: [AppType.Mobile, AppType.Desktop],
				label: () => _('Attachment download behaviour'),
				description: () => _('In "Manual" mode, attachments are downloaded only when you click on them. In "Auto", they are downloaded when you open the note. In "Always", all the attachments are downloaded whether you open the note or not.'),
				options: () => {
					return {
						always: _('Always'),
						manual: _('Manual'),
						auto: _('Auto'),
					};
				},
				storage: SettingStorage.File,
				isGlobal: true,
			},

			'sync.3.auth': { value: '', type: SettingItemType.String, public: false },
			'sync.4.auth': { value: '', type: SettingItemType.String, public: false },
			'sync.7.auth': { value: '', type: SettingItemType.String, public: false },
			'sync.9.auth': { value: '', type: SettingItemType.String, public: false },
			'sync.10.auth': { value: '', type: SettingItemType.String, public: false },
			'sync.1.context': { value: '', type: SettingItemType.String, public: false },
			'sync.2.context': { value: '', type: SettingItemType.String, public: false },
			'sync.3.context': { value: '', type: SettingItemType.String, public: false },
			'sync.4.context': { value: '', type: SettingItemType.String, public: false },
			'sync.5.context': { value: '', type: SettingItemType.String, public: false },
			'sync.6.context': { value: '', type: SettingItemType.String, public: false },
			'sync.7.context': { value: '', type: SettingItemType.String, public: false },
			'sync.8.context': { value: '', type: SettingItemType.String, public: false },
			'sync.9.context': { value: '', type: SettingItemType.String, public: false },
			'sync.10.context': { value: '', type: SettingItemType.String, public: false },

			'sync.maxConcurrentConnections': { value: 5, type: SettingItemType.Int, storage: SettingStorage.File, isGlobal: true, public: true, advanced: true, section: 'sync', label: () => _('Max concurrent connections'), minimum: 1, maximum: 20, step: 1 },

			// The active folder ID is guaranteed to be valid as long as there's at least one
			// existing folder, so it is a good default in contexts where there's no currently
			// selected folder. It corresponds in general to the currently selected folder or
			// to the last folder that was selected.
			activeFolderId: { value: '', type: SettingItemType.String, public: false },
			notesParent: { value: '', type: SettingItemType.String, public: false },

			richTextBannerDismissed: { value: false, type: SettingItemType.Bool, storage: SettingStorage.File, isGlobal: true, public: false },

			firstStart: { value: true, type: SettingItemType.Bool, public: false },
			locale: {
				value: defaultLocale(),
				type: SettingItemType.String,
				isEnum: true,
				public: true,
				label: () => _('Language'),
				options: () => {
					return ObjectUtils.sortByValue(supportedLocalesToLanguages({ includeStats: true }));
				},
				storage: SettingStorage.File,
				isGlobal: true,
			},
			dateFormat: {
				value: Setting.DATE_FORMAT_1,
				type: SettingItemType.String,
				isEnum: true,
				public: true,
				label: () => _('Date format'),
				options: () => {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					const options: any = {};
					const now = new Date('2017-01-30T12:00:00').getTime();
					options[Setting.DATE_FORMAT_1] = time.formatMsToLocal(now, Setting.DATE_FORMAT_1);
					options[Setting.DATE_FORMAT_2] = time.formatMsToLocal(now, Setting.DATE_FORMAT_2);
					options[Setting.DATE_FORMAT_3] = time.formatMsToLocal(now, Setting.DATE_FORMAT_3);
					options[Setting.DATE_FORMAT_4] = time.formatMsToLocal(now, Setting.DATE_FORMAT_4);
					options[Setting.DATE_FORMAT_5] = time.formatMsToLocal(now, Setting.DATE_FORMAT_5);
					options[Setting.DATE_FORMAT_6] = time.formatMsToLocal(now, Setting.DATE_FORMAT_6);
					options[Setting.DATE_FORMAT_7] = time.formatMsToLocal(now, Setting.DATE_FORMAT_7);
					options[Setting.DATE_FORMAT_8] = time.formatMsToLocal(now, Setting.DATE_FORMAT_8);
					options[Setting.DATE_FORMAT_9] = time.formatMsToLocal(now, Setting.DATE_FORMAT_9);
					return options;
				},
				storage: SettingStorage.File,
				isGlobal: true,
			},
			timeFormat: {
				value: Setting.TIME_FORMAT_1,
				type: SettingItemType.String,
				isEnum: true,
				public: true,
				label: () => _('Time format'),
				options: () => {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					const options: any = {};
					const now = new Date('2017-01-30T20:30:00').getTime();
					options[Setting.TIME_FORMAT_1] = time.formatMsToLocal(now, Setting.TIME_FORMAT_1);
					options[Setting.TIME_FORMAT_2] = time.formatMsToLocal(now, Setting.TIME_FORMAT_2);
					options[Setting.TIME_FORMAT_3] = time.formatMsToLocal(now, Setting.TIME_FORMAT_3);
					return options;
				},
				storage: SettingStorage.File,
				isGlobal: true,
			},

			'ocr.enabled': {
				value: false,
				type: SettingItemType.Bool,
				public: true,
				appTypes: [AppType.Desktop],
				label: () => _('Enable optical character recognition (OCR)'),
				description: () => _('When enabled, the application will scan your attachments and extract the text from it. This will allow you to search for text in these attachments.'),
				storage: SettingStorage.File,
				isGlobal: true,
			},

			theme: {
				value: Setting.THEME_LIGHT,
				type: SettingItemType.Int,
				public: true,
				appTypes: [AppType.Mobile, AppType.Desktop],
				show: (settings) => {
					return !settings['themeAutoDetect'];
				},
				isEnum: true,
				label: () => _('Theme'),
				section: 'appearance',
				options: () => themeOptions(),
				storage: SettingStorage.File,
				isGlobal: true,
			},

			themeAutoDetect: {
				value: false,
				type: SettingItemType.Bool,
				section: 'appearance',
				appTypes: [AppType.Mobile, AppType.Desktop],
				public: true,
				label: () => _('Automatically switch theme to match system theme'),
				storage: SettingStorage.File,
				isGlobal: true,
			},

			preferredLightTheme: {
				value: Setting.THEME_LIGHT,
				type: SettingItemType.Int,
				public: true,
				show: (settings) => {
					return settings['themeAutoDetect'];
				},
				appTypes: [AppType.Mobile, AppType.Desktop],
				isEnum: true,
				label: () => _('Preferred light theme'),
				section: 'appearance',
				options: () => themeOptions(),
				storage: SettingStorage.File,
				isGlobal: true,
			},

			preferredDarkTheme: {
				value: Setting.THEME_DARK,
				type: SettingItemType.Int,
				public: true,
				show: (settings) => {
					return settings['themeAutoDetect'];
				},
				appTypes: [AppType.Mobile, AppType.Desktop],
				isEnum: true,
				label: () => _('Preferred dark theme'),
				section: 'appearance',
				options: () => themeOptions(),
				storage: SettingStorage.File,
				isGlobal: true,
			},

			notificationPermission: {
				value: '',
				type: SettingItemType.String,
				public: false,
			},

			showNoteCounts: { value: true, type: SettingItemType.Bool, storage: SettingStorage.File, isGlobal: true, public: false, advanced: true, appTypes: [AppType.Desktop, AppType.Cli], label: () => _('Show note counts') },

			layoutButtonSequence: {
				value: Setting.LAYOUT_ALL,
				type: SettingItemType.Int,
				public: false,
				appTypes: [AppType.Desktop],
				isEnum: true,
				options: () => ({
					[Setting.LAYOUT_ALL]: _('%s / %s / %s', _('Editor'), _('Viewer'), _('Split View')),
					[Setting.LAYOUT_EDITOR_VIEWER]: _('%s / %s', _('Editor'), _('Viewer')),
					[Setting.LAYOUT_EDITOR_SPLIT]: _('%s / %s', _('Editor'), _('Split View')),
					[Setting.LAYOUT_VIEWER_SPLIT]: _('%s / %s', _('Viewer'), _('Split View')),
				}),
				storage: SettingStorage.File,
				isGlobal: true,
			},
			uncompletedTodosOnTop: { value: true, type: SettingItemType.Bool, storage: SettingStorage.File, isGlobal: true, section: 'note', public: true, appTypes: [AppType.Cli], label: () => _('Uncompleted to-dos on top') },
			showCompletedTodos: { value: true, type: SettingItemType.Bool, storage: SettingStorage.File, isGlobal: true, section: 'note', public: true, appTypes: [AppType.Cli], label: () => _('Show completed to-dos') },
			'notes.sortOrder.field': {
				value: 'user_updated_time',
				type: SettingItemType.String,
				section: 'note',
				isEnum: true,
				public: true,
				appTypes: [AppType.Cli],
				label: () => _('Sort notes by'),
				options: () => {
					const Note = require('./Note').default;
					const noteSortFields = ['user_updated_time', 'user_created_time', 'title', 'order', 'todo_due', 'todo_completed'];
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					const options: any = {};
					for (let i = 0; i < noteSortFields.length; i++) {
						options[noteSortFields[i]] = toTitleCase(Note.fieldToLabel(noteSortFields[i]));
					}
					return options;
				},
				storage: SettingStorage.File,
				isGlobal: true,
			},
			'editor.autoMatchingBraces': {
				value: true,
				type: SettingItemType.Bool,
				public: true,
				section: 'note',
				appTypes: [AppType.Desktop],
				label: () => _('Auto-pair braces, parentheses, quotations, etc.'),
				storage: SettingStorage.File,
				isGlobal: true,
			},
			'notes.columns': {
				value: defaultListColumns(),
				public: false,
				type: SettingItemType.Array,
				storage: SettingStorage.File,
				isGlobal: false,
			},

			'notes.sortOrder.reverse': { value: true, type: SettingItemType.Bool, storage: SettingStorage.File, isGlobal: true, section: 'note', public: true, label: () => _('Reverse sort order'), appTypes: [AppType.Cli] },
			// NOTE: A setting whose name starts with 'notes.sortOrder' is special,
			// which implies changing the setting automatically triggers the refresh of notes.
			// See lib/BaseApplication.ts/generalMiddleware() for details.
			'notes.sortOrder.buttonsVisible': {
				value: true,
				type: SettingItemType.Bool,
				storage: SettingStorage.File,
				section: 'appearance',
				public: true,
				label: () => _('Show sort order buttons'),
				// description: () => _('If true, sort order buttons (field + reverse) for notes are shown at the top of Note List.'),
				appTypes: [AppType.Desktop],
				isGlobal: true,
			},
			'notes.perFieldReversalEnabled': {
				value: true,
				type: SettingItemType.Bool,
				storage: SettingStorage.File,
				section: 'note',
				public: false,
				appTypes: [AppType.Cli, AppType.Desktop],
			},
			'notes.perFieldReverse': {
				value: {
					user_updated_time: true,
					user_created_time: true,
					title: false,
					order: false,
				},
				type: SettingItemType.Object,
				storage: SettingStorage.File,
				section: 'note',
				public: false,
				appTypes: [AppType.Cli, AppType.Desktop],
			},
			'notes.perFolderSortOrderEnabled': {
				value: true,
				type: SettingItemType.Bool,
				storage: SettingStorage.File,
				section: 'folder',
				public: false,
				appTypes: [AppType.Cli, AppType.Desktop],
			},
			'notes.perFolderSortOrders': {
				value: {},
				type: SettingItemType.Object,
				storage: SettingStorage.File,
				section: 'folder',
				public: false,
				appTypes: [AppType.Cli, AppType.Desktop],
			},
			'notes.sharedSortOrder': {
				value: {},
				type: SettingItemType.Object,
				section: 'folder',
				public: false,
				appTypes: [AppType.Cli, AppType.Desktop],
			},
			'folders.sortOrder.field': {
				value: 'title',
				type: SettingItemType.String,
				isEnum: true,
				public: true,
				appTypes: [AppType.Cli],
				label: () => _('Sort notebooks by'),
				options: () => {
					const Folder = require('./Folder').default;
					const folderSortFields = ['title', 'last_note_user_updated_time'];
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					const options: any = {};
					for (let i = 0; i < folderSortFields.length; i++) {
						options[folderSortFields[i]] = toTitleCase(Folder.fieldToLabel(folderSortFields[i]));
					}
					return options;
				},
				storage: SettingStorage.File,
			},
			'folders.sortOrder.reverse': { value: false, type: SettingItemType.Bool, storage: SettingStorage.File, isGlobal: true, public: true, label: () => _('Reverse sort order'), appTypes: [AppType.Cli] },
			trackLocation: { value: true, type: SettingItemType.Bool, section: 'note', storage: SettingStorage.File, isGlobal: true, public: true, label: () => _('Save geo-location with notes') },

			'editor.usePlainText': {
				value: false,
				type: SettingItemType.Bool,
				section: 'note',
				public: true,
				appTypes: [AppType.Mobile],
				label: () => 'Use the plain text editor',
				description: () => 'The plain text editor has various issues and is no longer supported. If you are having issues with the new editor however you can revert to the old one using this setting.',
				storage: SettingStorage.File,
				isGlobal: true,
			},

			// Enables/disables spellcheck in the mobile markdown beta editor.
			'editor.mobile.spellcheckEnabled': {
				value: true,
				type: SettingItemType.Bool,
				section: 'note',
				public: true,
				appTypes: [AppType.Mobile],
				label: () => _('Enable spellcheck in the text editor'),
				storage: SettingStorage.File,
				isGlobal: true,
			},

			'editor.mobile.toolbarEnabled': {
				value: true,
				type: SettingItemType.Bool,
				section: 'note',
				public: true,
				appTypes: [AppType.Mobile],
				label: () => _('Enable the Markdown toolbar'),
				storage: SettingStorage.File,
				isGlobal: true,
			},

			// Works around a bug in which additional space is visible beneath the toolbar on some devices.
			// See https://github.com/laurent22/joplin/pull/6823
			'editor.mobile.removeSpaceBelowToolbar': {
				value: false,
				type: SettingItemType.Bool,
				section: 'note',
				public: true,
				appTypes: [AppType.Mobile],
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				show: (settings: any) => settings['editor.mobile.removeSpaceBelowToolbar'],
				label: () => 'Remove extra space below the markdown toolbar',
				description: () => 'Works around bug on some devices where the markdown toolbar does not touch the bottom of the screen.',
				storage: SettingStorage.File,
				isGlobal: true,
			},

			newTodoFocus: {
				value: 'title',
				type: SettingItemType.String,
				section: 'note',
				isEnum: true,
				public: true,
				appTypes: [AppType.Desktop],
				label: () => _('When creating a new to-do:'),
				options: () => {
					return {
						title: _('Focus title'),
						body: _('Focus body'),
					};
				},
				storage: SettingStorage.File,
				isGlobal: true,
			},
			newNoteFocus: {
				value: 'body',
				type: SettingItemType.String,
				section: 'note',
				isEnum: true,
				public: true,
				appTypes: [AppType.Desktop],
				label: () => _('When creating a new note:'),
				options: () => {
					return {
						title: _('Focus title'),
						body: _('Focus body'),
					};
				},
				storage: SettingStorage.File,
				isGlobal: true,
			},
			imageResizing: {
				value: 'alwaysAsk',
				type: SettingItemType.String,
				section: 'note',
				isEnum: true,
				public: true,
				appTypes: [AppType.Mobile, AppType.Desktop],
				label: () => _('Resize large images:'),
				description: () => _('Shrink large images before adding them to notes.'),
				options: () => {
					return {
						alwaysAsk: _('Always ask'),
						alwaysResize: _('Always resize'),
						neverResize: _('Never resize'),
					};
				},
				storage: SettingStorage.File,
				isGlobal: true,
			},

			'notes.listRendererId': {
				value: 'compact',
				type: SettingItemType.String,
				public: false,
				appTypes: [AppType.Desktop],
				storage: SettingStorage.File,
				isGlobal: true,
			},

			'plugins.states': {
				value: '',
				type: SettingItemType.Object,
				section: 'plugins',
				public: true,
				appTypes: [AppType.Desktop, AppType.Mobile],
				needRestart: true,
				autoSave: true,
			},

			'plugins.enableWebviewDebugging': {
				value: false,
				type: SettingItemType.Bool,
				section: 'plugins',
				public: true,
				appTypes: [AppType.Mobile],
				show: (settings) => {
					// Hide on iOS due to App Store guidelines. See
					// https://github.com/laurent22/joplin/pull/10086 for details.
					return shim.mobilePlatform() !== 'ios' && settings['plugins.pluginSupportEnabled'];
				},
				needRestart: true,
				advanced: true,

				label: () => _('Plugin WebView debugging'),
				description: () => _('Allows debugging mobile plugins. See %s for details.', 'https://https://joplinapp.org/help/api/references/mobile_plugin_debugging/'),
			},

			'plugins.pluginSupportEnabled': {
				value: false,
				public: true,
				autoSave: true,
				section: 'plugins',
				advanced: true,
				type: SettingItemType.Bool,
				appTypes: [AppType.Mobile],
				label: () => _('Enable plugin support'),
				// On mobile, we have a screen that manages this setting when it's disabled.
				show: (settings) => settings['plugins.pluginSupportEnabled'],
			},

			'plugins.devPluginPaths': {
				value: '',
				type: SettingItemType.String,
				section: 'plugins',
				public: true,
				advanced: true,
				appTypes: [AppType.Desktop],
				label: () => 'Development plugins',
				description: () => 'You may add multiple plugin paths, each separated by a comma. You will need to restart the application for the changes to take effect.',
				storage: SettingStorage.File,
			},

			// Deprecated - use markdown.plugin.*
			'markdown.softbreaks': { storage: SettingStorage.File, isGlobal: true, value: false, type: SettingItemType.Bool, public: false, appTypes: [AppType.Mobile, AppType.Desktop] },
			'markdown.typographer': { storage: SettingStorage.File, isGlobal: true, value: false, type: SettingItemType.Bool, public: false, appTypes: [AppType.Mobile, AppType.Desktop] },
			// Deprecated

			'markdown.plugin.softbreaks': { storage: SettingStorage.File, isGlobal: true, value: false, type: SettingItemType.Bool, section: 'markdownPlugins', public: true, appTypes: [AppType.Mobile, AppType.Desktop], label: () => `${_('Enable soft breaks')}${wysiwygYes}` },
			'markdown.plugin.typographer': { storage: SettingStorage.File, isGlobal: true, value: false, type: SettingItemType.Bool, section: 'markdownPlugins', public: true, appTypes: [AppType.Mobile, AppType.Desktop], label: () => `${_('Enable typographer support')}${wysiwygYes}` },
			'markdown.plugin.linkify': { storage: SettingStorage.File, isGlobal: true, value: true, type: SettingItemType.Bool, section: 'markdownPlugins', public: true, appTypes: [AppType.Mobile, AppType.Desktop], label: () => `${_('Enable Linkify')}${wysiwygYes}` },

			'markdown.plugin.katex': { storage: SettingStorage.File, isGlobal: true, value: true, type: SettingItemType.Bool, section: 'markdownPlugins', public: true, appTypes: [AppType.Mobile, AppType.Desktop], label: () => `${_('Enable math expressions')}${wysiwygYes}` },
			'markdown.plugin.fountain': { storage: SettingStorage.File, isGlobal: true, value: false, type: SettingItemType.Bool, section: 'markdownPlugins', public: true, appTypes: [AppType.Mobile, AppType.Desktop], label: () => `${_('Enable Fountain syntax support')}${wysiwygYes}` },
			'markdown.plugin.mermaid': { storage: SettingStorage.File, isGlobal: true, value: true, type: SettingItemType.Bool, section: 'markdownPlugins', public: true, appTypes: [AppType.Mobile, AppType.Desktop], label: () => `${_('Enable Mermaid diagrams support')}${wysiwygYes}` },

			'markdown.plugin.audioPlayer': { storage: SettingStorage.File, isGlobal: true, value: true, type: SettingItemType.Bool, section: 'markdownPlugins', public: true, appTypes: [AppType.Mobile, AppType.Desktop], label: () => `${_('Enable audio player')}${wysiwygNo}` },
			'markdown.plugin.videoPlayer': { storage: SettingStorage.File, isGlobal: true, value: true, type: SettingItemType.Bool, section: 'markdownPlugins', public: true, appTypes: [AppType.Mobile, AppType.Desktop], label: () => `${_('Enable video player')}${wysiwygNo}` },
			'markdown.plugin.pdfViewer': { storage: SettingStorage.File, isGlobal: true, value: !mobilePlatform, type: SettingItemType.Bool, section: 'markdownPlugins', public: true, appTypes: [AppType.Desktop], label: () => `${_('Enable PDF viewer')}${wysiwygNo}` },
			'markdown.plugin.mark': { storage: SettingStorage.File, isGlobal: true, value: true, type: SettingItemType.Bool, section: 'markdownPlugins', public: true, appTypes: [AppType.Mobile, AppType.Desktop], label: () => `${_('Enable ==mark== syntax')}${wysiwygYes}` },
			'markdown.plugin.footnote': { storage: SettingStorage.File, isGlobal: true, value: true, type: SettingItemType.Bool, section: 'markdownPlugins', public: true, appTypes: [AppType.Mobile, AppType.Desktop], label: () => `${_('Enable footnotes')}${wysiwygNo}` },
			'markdown.plugin.toc': { storage: SettingStorage.File, isGlobal: true, value: true, type: SettingItemType.Bool, section: 'markdownPlugins', public: true, appTypes: [AppType.Mobile, AppType.Desktop], label: () => `${_('Enable table of contents extension')}${wysiwygNo}` },
			'markdown.plugin.sub': { storage: SettingStorage.File, isGlobal: true, value: false, type: SettingItemType.Bool, section: 'markdownPlugins', public: true, appTypes: [AppType.Mobile, AppType.Desktop], label: () => `${_('Enable ~sub~ syntax')}${wysiwygYes}` },
			'markdown.plugin.sup': { storage: SettingStorage.File, isGlobal: true, value: false, type: SettingItemType.Bool, section: 'markdownPlugins', public: true, appTypes: [AppType.Mobile, AppType.Desktop], label: () => `${_('Enable ^sup^ syntax')}${wysiwygYes}` },
			'markdown.plugin.deflist': { storage: SettingStorage.File, isGlobal: true, value: false, type: SettingItemType.Bool, section: 'markdownPlugins', public: true, appTypes: [AppType.Mobile, AppType.Desktop], label: () => `${_('Enable deflist syntax')}${wysiwygNo}` },
			'markdown.plugin.abbr': { storage: SettingStorage.File, isGlobal: true, value: false, type: SettingItemType.Bool, section: 'markdownPlugins', public: true, appTypes: [AppType.Mobile, AppType.Desktop], label: () => `${_('Enable abbreviation syntax')}${wysiwygNo}` },
			'markdown.plugin.emoji': { storage: SettingStorage.File, isGlobal: true, value: false, type: SettingItemType.Bool, section: 'markdownPlugins', public: true, appTypes: [AppType.Mobile, AppType.Desktop], label: () => `${_('Enable markdown emoji')}${wysiwygNo}` },
			'markdown.plugin.insert': { storage: SettingStorage.File, isGlobal: true, value: false, type: SettingItemType.Bool, section: 'markdownPlugins', public: true, appTypes: [AppType.Mobile, AppType.Desktop], label: () => `${_('Enable ++insert++ syntax')}${wysiwygYes}` },
			'markdown.plugin.multitable': { storage: SettingStorage.File, isGlobal: true, value: false, type: SettingItemType.Bool, section: 'markdownPlugins', public: true, appTypes: [AppType.Mobile, AppType.Desktop], label: () => `${_('Enable multimarkdown table extension')}${wysiwygNo}` },

			// Tray icon (called AppIndicator) doesn't work in Ubuntu
			// http://www.webupd8.org/2017/04/fix-appindicator-not-working-for.html
			// Might be fixed in Electron 18.x but no non-beta release yet. So for now
			// by default we disable it on Linux.
			showTrayIcon: {
				value: platform !== 'linux',
				type: SettingItemType.Bool,
				section: 'application',
				public: true,
				appTypes: [AppType.Desktop],
				label: () => _('Show tray icon'),
				description: () => {
					return platform === 'linux' ? _('Note: Does not work in all desktop environments.') : _('This will allow Joplin to run in the background. It is recommended to enable this setting so that your notes are constantly being synchronised, thus reducing the number of conflicts.');
				},
				storage: SettingStorage.File,
				isGlobal: true,
			},

			showMenuBar: {
				value: true, // Show the menu bar by default
				type: SettingItemType.Bool,
				public: false,
				appTypes: [AppType.Desktop],
			},

			startMinimized: { value: false, type: SettingItemType.Bool, storage: SettingStorage.File, isGlobal: true, section: 'application', public: true, appTypes: [AppType.Desktop], label: () => _('Start application minimised in the tray icon') },

			collapsedFolderIds: { value: [], type: SettingItemType.Array, public: false },

			'keychain.supported': { value: -1, type: SettingItemType.Int, public: false },
			'db.ftsEnabled': { value: -1, type: SettingItemType.Int, public: false },
			'db.fuzzySearchEnabled': { value: -1, type: SettingItemType.Int, public: false },
			'encryption.enabled': { value: false, type: SettingItemType.Bool, public: false },
			'encryption.activeMasterKeyId': { value: '', type: SettingItemType.String, public: false },
			'encryption.passwordCache': { value: {}, type: SettingItemType.Object, public: false, secure: true },
			'encryption.masterPassword': { value: '', type: SettingItemType.String, public: false, secure: true },
			'encryption.shouldReencrypt': {
				value: -1, // will be set on app startup
				type: SettingItemType.Int,
				public: false,
			},

			'sync.userId': {
				value: '',
				type: SettingItemType.String,
				public: false,
			},

			// Deprecated in favour of windowContentZoomFactor
			'style.zoom': { value: 100, type: SettingItemType.Int, public: false, storage: SettingStorage.File, isGlobal: true, appTypes: [AppType.Desktop], section: 'appearance', label: () => '', minimum: 50, maximum: 500, step: 10 },

			'style.editor.fontSize': {
				value: 15,
				type: SettingItemType.Int,
				public: true,
				storage: SettingStorage.File,
				isGlobal: true,
				appTypes: [AppType.Desktop, AppType.Mobile],
				section: 'appearance',
				label: () => _('Editor font size'),
				minimum: 4,
				maximum: 50,
				step: 1,
			},
			'style.editor.fontFamily':
				(mobilePlatform) ?
					({
						value: Setting.FONT_DEFAULT,
						type: SettingItemType.String,
						isEnum: true,
						public: true,
						label: () => _('Editor font'),
						appTypes: [AppType.Mobile],
						section: 'appearance',
						options: () => {
							// IMPORTANT: The font mapping must match the one in global-styles.js::editorFont()
							if (mobilePlatform === 'ios') {
								return {
									[Setting.FONT_DEFAULT]: _('Default'),
									[Setting.FONT_MENLO]: 'Menlo',
									[Setting.FONT_COURIER_NEW]: 'Courier New',
									[Setting.FONT_AVENIR]: 'Avenir',
								};
							}
							return {
								[Setting.FONT_DEFAULT]: _('Default'),
								[Setting.FONT_MONOSPACE]: 'Monospace',
							};
						},
						storage: SettingStorage.File,
						isGlobal: true,
					}) : {
						value: '',
						type: SettingItemType.String,
						public: true,
						appTypes: [AppType.Desktop],
						section: 'appearance',
						label: () => _('Editor font family'),
						description: () =>
							_('Used for most text in the markdown editor. If not found, a generic proportional (variable width) font is used.'),
						storage: SettingStorage.File,
						isGlobal: true,
						subType: SettingItemSubType.FontFamily,
					},
			'style.editor.monospaceFontFamily': {
				value: '',
				type: SettingItemType.String,
				public: true,
				appTypes: [AppType.Desktop],
				section: 'appearance',
				label: () => _('Editor monospace font family'),
				description: () =>
					_('Used where a fixed width font is needed to lay out text legibly (e.g. tables, checkboxes, code). If not found, a generic monospace (fixed width) font is used.'),
				storage: SettingStorage.File,
				isGlobal: true,
				subType: SettingItemSubType.MonospaceFontFamily,
			},

			'style.editor.contentMaxWidth': { value: 0, type: SettingItemType.Int, public: true, storage: SettingStorage.File, isGlobal: true, appTypes: [AppType.Desktop], section: 'appearance', label: () => _('Editor maximum width'), description: () => _('Set it to 0 to make it take the complete available space. Recommended width is 600.') },

			'ui.layout': { value: {}, type: SettingItemType.Object, storage: SettingStorage.File, isGlobal: true, public: false, appTypes: [AppType.Desktop] },

			'ui.lastSelectedPluginPanel': {
				value: '',
				type: SettingItemType.String,
				public: false,
				description: () => 'The last selected plugin panel ID in pop-up mode (mobile).',
				storage: SettingStorage.Database,
				appTypes: [AppType.Mobile],
			},

			// TODO: Is there a better way to do this? The goal here is to simply have
			// a way to display a link to the customizable stylesheets, not for it to
			// serve as a customizable Setting. But because the Setting page is auto-
			// generated from this list of settings, there wasn't a really elegant way
			// to do that directly in the React markup.
			'style.customCss.renderedMarkdown': {
				value: null,
				onClick: () => {
					shim.openOrCreateFile(
						this.customCssFilePath(Setting.customCssFilenames.RENDERED_MARKDOWN),
						'/* For styling the rendered Markdown */',
					);
				},
				type: SettingItemType.Button,
				public: true,
				appTypes: [AppType.Desktop],
				label: () => _('Custom stylesheet for rendered Markdown'),
				section: 'appearance',
				advanced: true,
				storage: SettingStorage.File,
				isGlobal: true,
			},
			'style.customCss.joplinApp': {
				value: null,
				onClick: () => {
					shim.openOrCreateFile(
						this.customCssFilePath(Setting.customCssFilenames.JOPLIN_APP),
						`/* For styling the entire Joplin app (except the rendered Markdown, which is defined in \`${Setting.customCssFilenames.RENDERED_MARKDOWN}\`) */`,
					);
				},
				type: SettingItemType.Button,
				public: true,
				appTypes: [AppType.Desktop],
				label: () => _('Custom stylesheet for Joplin-wide app styles'),
				section: 'appearance',
				advanced: true,
				description: () => 'CSS file support is provided for your convenience, but they are advanced settings, and styles you define may break from one version to the next. If you want to use them, please know that it might require regular development work from you to keep them working. The Joplin team cannot make a commitment to keep the application HTML structure stable.',
				storage: SettingStorage.File,
				isGlobal: true,
			},

			'sync.clearLocalSyncStateButton': {
				value: null,
				type: SettingItemType.Button,
				public: true,
				appTypes: [AppType.Desktop],
				label: () => _('Re-upload local data to sync target'),
				section: 'sync',
				advanced: true,
				description: () => 'If the data on the sync target is incorrect or empty, you can use this button to force a re-upload of your data to the sync target. Application will have to be restarted',
			},

			'sync.clearLocalDataButton': {
				value: null,
				type: SettingItemType.Button,
				public: true,
				appTypes: [AppType.Desktop],
				label: () => _('Delete local data and re-download from sync target'),
				section: 'sync',
				advanced: true,
				description: () => 'If the data on the sync target is correct but your local data is not, you can use this button to clear your local data and force re-downloading everything from the sync target. As your local data will be deleted first, it is recommended to export your data as JEX first. Application will have to be restarted',
			},


			autoUpdateEnabled: { value: true, type: SettingItemType.Bool, storage: SettingStorage.File, isGlobal: true, section: 'application', public: platform !== 'linux', appTypes: [AppType.Desktop], label: () => _('Automatically check for updates') },
			'autoUpdate.includePreReleases': { value: false, type: SettingItemType.Bool, section: 'application', storage: SettingStorage.File, isGlobal: true, public: true, appTypes: [AppType.Desktop], label: () => _('Get pre-releases when checking for updates'), description: () => _('See the pre-release page for more details: %s', 'https://joplinapp.org/help/about/prereleases') },

			'autoUploadCrashDumps': {
				value: false,
				section: 'application',
				type: SettingItemType.Bool,
				public: true,
				appTypes: [AppType.Desktop],
				label: () => 'Automatically upload crash reports',
				description: () => 'If you experience a crash, please enable this option to automatically send crash reports. You will need to restart the application for this change to take effect.',
				isGlobal: true,
				storage: SettingStorage.File,
			},

			'clipperServer.autoStart': { value: false, type: SettingItemType.Bool, storage: SettingStorage.File, isGlobal: true, public: false },
			'sync.interval': {
				value: 300,
				type: SettingItemType.Int,
				section: 'sync',
				isEnum: true,
				public: true,
				label: () => _('Synchronisation interval'),
				options: () => {
					return {
						0: _('Disabled'),
						300: _('%d minutes', 5),
						600: _('%d minutes', 10),
						1800: _('%d minutes', 30),
						3600: _('%d hour', 1),
						43200: _('%d hours', 12),
						86400: _('%d hours', 24),
					};
				},
				storage: SettingStorage.File,
				isGlobal: true,
			},
			'sync.mobileWifiOnly': {
				value: false,
				type: SettingItemType.Bool,
				section: 'sync',
				public: true,
				label: () => _('Synchronise only over WiFi connection'),
				storage: SettingStorage.File,
				appTypes: [AppType.Mobile],
				isGlobal: true,
			},
			noteVisiblePanes: { value: ['editor', 'viewer'], type: SettingItemType.Array, storage: SettingStorage.File, isGlobal: true, public: false, appTypes: [AppType.Desktop] },
			tagHeaderIsExpanded: { value: true, type: SettingItemType.Bool, public: false, appTypes: [AppType.Desktop] },
			folderHeaderIsExpanded: { value: true, type: SettingItemType.Bool, public: false, appTypes: [AppType.Desktop] },
			editor: { value: '', type: SettingItemType.String, subType: 'file_path_and_args', storage: SettingStorage.File, isGlobal: true, public: true, appTypes: [AppType.Cli, AppType.Desktop], label: () => _('Text editor command'), description: () => _('The editor command (may include arguments) that will be used to open a note. If none is provided it will try to auto-detect the default editor.') },
			'export.pdfPageSize': { value: 'A4', type: SettingItemType.String, advanced: true, storage: SettingStorage.File, isGlobal: true, isEnum: true, public: true, appTypes: [AppType.Desktop], label: () => _('Page size for PDF export'), options: () => {
				return {
					'A4': _('A4'),
					'Letter': _('Letter'),
					'A3': _('A3'),
					'A5': _('A5'),
					'Tabloid': _('Tabloid'),
					'Legal': _('Legal'),
				};
			} },
			'export.pdfPageOrientation': { value: 'portrait', type: SettingItemType.String, storage: SettingStorage.File, isGlobal: true, advanced: true, isEnum: true, public: true, appTypes: [AppType.Desktop], label: () => _('Page orientation for PDF export'), options: () => {
				return {
					'portrait': _('Portrait'),
					'landscape': _('Landscape'),
				};
			} },

			useCustomPdfViewer: {
				value: false,
				type: SettingItemType.Bool,
				public: false,
				advanced: true,
				appTypes: [AppType.Desktop],
				label: () => 'Use custom PDF viewer (Beta)',
				description: () => 'The custom PDF viewer remembers the last page that was viewed, however it has some technical issues.',
				storage: SettingStorage.File,
				isGlobal: true,
			},

			'editor.keyboardMode': {
				value: '',
				type: SettingItemType.String,
				public: true,
				appTypes: [AppType.Desktop],
				isEnum: true,
				advanced: true,
				label: () => _('Keyboard Mode'),
				options: () => {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					const output: any = {};
					output[''] = _('Default');
					output['emacs'] = _('Emacs');
					output['vim'] = _('Vim');
					return output;
				},
				storage: SettingStorage.File,
				isGlobal: true,
			},

			'editor.spellcheckBeta': {
				value: false,
				type: SettingItemType.Bool,
				public: true,
				appTypes: [AppType.Desktop],
				label: () => 'Enable spell checking in Markdown editor? (WARNING BETA feature)',
				description: () => 'Spell checker in the Markdown editor was previously unstable (cursor location was not stable, sometimes edits would not be saved or reflected in the viewer, etc.) however it appears to be more reliable now. If you notice any issue, please report it on GitHub or the Joplin Forum (Help -> Joplin Forum)',
				storage: SettingStorage.File,
				isGlobal: true,
			},

			'imageeditor.jsdrawToolbar': {
				value: '',
				type: SettingItemType.String,
				public: false,
				appTypes: [AppType.Mobile],
				label: () => '',
				storage: SettingStorage.File,
			},

			'imageeditor.imageTemplate': {
				value: '{ }',
				type: SettingItemType.String,
				public: false,
				appTypes: [AppType.Mobile],
				label: () => 'Template for the image editor',
				storage: SettingStorage.File,
			},

			// 2023-09-07: This setting is now used to track the desktop beta editor. It
			// was used to track the mobile beta editor previously.
			'editor.beta': {
				value: false,
				type: SettingItemType.Bool,
				section: 'general',
				public: true,
				appTypes: [AppType.Desktop],
				label: () => 'Opt-in to the editor beta',
				description: () => 'This beta adds improved accessibility and plugin API compatibility with the mobile editor. If you find bugs, please report them in the Discourse forum.',
				storage: SettingStorage.File,
				isGlobal: true,
			},

			'linking.extraAllowedExtensions': {
				value: [],
				type: SettingItemType.Array,
				public: false,
				appTypes: [AppType.Desktop],
				label: () => 'Additional file types that can be opened without confirmation.',
				storage: SettingStorage.File,
			},

			'net.customCertificates': {
				value: '',
				type: SettingItemType.String,
				section: 'sync',
				advanced: true,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				show: (settings: any) => {
					return [
						SyncTargetRegistry.nameToId('amazon_s3'),
						SyncTargetRegistry.nameToId('nextcloud'),
						SyncTargetRegistry.nameToId('webdav'),
						SyncTargetRegistry.nameToId('joplinServer'),
					].indexOf(settings['sync.target']) >= 0;
				},
				public: true,
				appTypes: [AppType.Desktop, AppType.Cli],
				label: () => _('Custom TLS certificates'),
				description: () => _('Comma-separated list of paths to directories to load the certificates from, or path to individual cert files. For example: /my/cert_dir, /other/custom.pem. Note that if you make changes to the TLS settings, you must save your changes before clicking on "Check synchronisation configuration".'),
				storage: SettingStorage.File,
			},
			'net.ignoreTlsErrors': {
				value: false,
				type: SettingItemType.Bool,
				advanced: true,
				section: 'sync',
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				show: (settings: any) => {
					return (shim.isNode() || shim.mobilePlatform() === 'android') &&
						[
							SyncTargetRegistry.nameToId('amazon_s3'),
							SyncTargetRegistry.nameToId('nextcloud'),
							SyncTargetRegistry.nameToId('webdav'),
							SyncTargetRegistry.nameToId('joplinServer'),
							// Needs to be enabled for Joplin Cloud too because
							// some companies filter all traffic and swap TLS
							// certificates, which result in error
							// UNABLE_TO_GET_ISSUER_CERT_LOCALLY
							SyncTargetRegistry.nameToId('joplinCloud'),
						].indexOf(settings['sync.target']) >= 0;
				},
				public: true,
				label: () => _('Ignore TLS certificate errors'),
				storage: SettingStorage.File,
			},
			'net.proxyEnabled': {
				value: false,
				type: SettingItemType.Bool,
				advanced: true,
				section: 'sync',
				isGlobal: true,
				public: true,
				label: () => _('Proxy enabled'),
				storage: SettingStorage.File,
			},
			'net.proxyUrl': {
				value: '',
				type: SettingItemType.String,
				advanced: true,
				section: 'sync',
				isGlobal: true,
				public: true,
				label: () => _('Proxy URL'),
				description: () => _('For example "%s"', 'http://my.proxy.com:80'),
				storage: SettingStorage.File,
			},
			'net.proxyTimeout': {
				value: 1,
				type: SettingItemType.Int,
				maximum: 60,
				advanced: true,
				section: 'sync',
				isGlobal: true,
				public: true,
				label: () => _('Proxy timeout (seconds)'),
				storage: SettingStorage.File,
			},
			'sync.wipeOutFailSafe': {
				value: true,
				type: SettingItemType.Bool,
				advanced: true,
				public: true,
				section: 'sync',
				label: () => _('Fail-safe'),
				description: () => _('Fail-safe: Do not wipe out local data when sync target is empty (often the result of a misconfiguration or bug)'),
				storage: SettingStorage.File,
			},

			'api.token': { value: null, type: SettingItemType.String, public: false, storage: SettingStorage.File, isGlobal: true },
			'api.port': { value: null, type: SettingItemType.Int, storage: SettingStorage.File, isGlobal: true, public: true, appTypes: [AppType.Cli], description: () => _('Specify the port that should be used by the API server. If not set, a default will be used.') },

			'resourceService.lastProcessedChangeId': { value: 0, type: SettingItemType.Int, public: false },
			'searchEngine.lastProcessedChangeId': { value: 0, type: SettingItemType.Int, public: false },
			'revisionService.lastProcessedChangeId': { value: 0, type: SettingItemType.Int, public: false },

			'searchEngine.initialIndexingDone': { value: false, type: SettingItemType.Bool, public: false },
			'searchEngine.lastProcessedResource': { value: '', type: SettingItemType.String, public: false },

			'revisionService.enabled': { section: 'revisionService', storage: SettingStorage.File, value: true, type: SettingItemType.Bool, public: true, label: () => _('Enable note history') },
			'revisionService.ttlDays': {
				section: 'revisionService',
				value: 90,
				type: SettingItemType.Int,
				public: true,
				minimum: 1,
				maximum: 365 * 2,
				step: 1,
				unitLabel: (value: number = null) => {
					return value === null ? _('days') : _('%d days', value);
				},
				label: () => _('Keep note history for'),
				storage: SettingStorage.File,
			},
			'revisionService.intervalBetweenRevisions': { section: 'revisionService', value: 1000 * 60 * 10, type: SettingItemType.Int, public: false },
			'revisionService.oldNoteInterval': { section: 'revisionService', value: 1000 * 60 * 60 * 24 * 7, type: SettingItemType.Int, public: false },

			'welcome.wasBuilt': { value: false, type: SettingItemType.Bool, public: false },
			'welcome.enabled': { value: true, type: SettingItemType.Bool, public: false },

			'camera.type': { value: 0, type: SettingItemType.Int, public: false, appTypes: [AppType.Mobile] },
			'camera.ratio': { value: '4:3', type: SettingItemType.String, public: false, appTypes: [AppType.Mobile] },

			'spellChecker.enabled': { value: true, type: SettingItemType.Bool, isGlobal: true, storage: SettingStorage.File, public: false },
			'spellChecker.language': { value: '', type: SettingItemType.String, isGlobal: true, storage: SettingStorage.File, public: false }, // Depreciated in favour of spellChecker.languages.
			'spellChecker.languages': { value: [], type: SettingItemType.Array, isGlobal: true, storage: SettingStorage.File, public: false },

			windowContentZoomFactor: {
				value: 100,
				type: SettingItemType.Int,
				public: false,
				appTypes: [AppType.Desktop],
				minimum: 30,
				maximum: 300,
				step: 10,
				storage: SettingStorage.File,
				isGlobal: true,
			},

			'layout.folderList.factor': {
				value: 1,
				type: SettingItemType.Int,
				section: 'appearance',
				public: true,
				appTypes: [AppType.Cli],
				label: () => _('Notebook list growth factor'),
				description: () =>
					_('The factor property sets how the item will grow or shrink ' +
				'to fit the available space in its container with respect to the other items. ' +
				'Thus an item with a factor of 2 will take twice as much space as an item with a factor of 1.' +
				'Restart app to see changes.'),
				storage: SettingStorage.File,
				isGlobal: true,
			},
			'layout.noteList.factor': {
				value: 1,
				type: SettingItemType.Int,
				section: 'appearance',
				public: true,
				appTypes: [AppType.Cli],
				label: () => _('Note list growth factor'),
				description: () =>
					_('The factor property sets how the item will grow or shrink ' +
				'to fit the available space in its container with respect to the other items. ' +
				'Thus an item with a factor of 2 will take twice as much space as an item with a factor of 1.' +
				'Restart app to see changes.'),
				storage: SettingStorage.File,
				isGlobal: true,
			},
			'layout.note.factor': {
				value: 2,
				type: SettingItemType.Int,
				section: 'appearance',
				public: true,
				appTypes: [AppType.Cli],
				label: () => _('Note area growth factor'),
				description: () =>
					_('The factor property sets how the item will grow or shrink ' +
				'to fit the available space in its container with respect to the other items. ' +
				'Thus an item with a factor of 2 will take twice as much space as an item with a factor of 1.' +
				'Restart app to see changes.'),
				storage: SettingStorage.File,
				isGlobal: true,
			},

			'syncInfoCache': {
				value: '',
				type: SettingItemType.String,
				public: false,
			},

			isSafeMode: {
				value: false,
				type: SettingItemType.Bool,
				public: false,
				appTypes: [AppType.Desktop],
				storage: SettingStorage.Database,
			},

			lastSettingDefaultMigration: {
				value: -1,
				type: SettingItemType.Int,
				public: false,
			},

			wasClosedSuccessfully: {
				value: true,
				type: SettingItemType.Bool,
				public: false,
			},

			installedDefaultPlugins: {
				value: [],
				type: SettingItemType.Array,
				public: false,
				storage: SettingStorage.Database,
			},

			// The biometrics feature is disabled by default and marked as beta
			// because it seems to cause a freeze or slow down startup on
			// certain devices. May be the reason for:
			//
			// - https://discourse.joplinapp.org/t/on-android-when-joplin-gets-started-offline/29951/1
			// - https://github.com/laurent22/joplin/issues/7956
			'security.biometricsEnabled': {
				value: false,
				type: SettingItemType.Bool,
				label: () => `${_('Use biometrics to secure access to the app')} (Beta)`,
				description: () => 'Important: This is a beta feature and it is not compatible with certain devices. If the app no longer starts after enabling this or is very slow to start, please uninstall and reinstall the app.',
				public: true,
				appTypes: [AppType.Mobile],
			},

			'security.biometricsSupportedSensors': {
				value: '',
				type: SettingItemType.String,
				public: false,
				appTypes: [AppType.Mobile],
			},

			'security.biometricsInitialPromptDone': {
				value: false,
				type: SettingItemType.Bool,
				public: false,
				appTypes: [AppType.Mobile],
			},

			// 'featureFlag.syncAccurateTimestamps': {
			// 	value: false,
			// 	type: SettingItemType.Bool,
			// 	public: false,
			// 	storage: SettingStorage.File,
			// },

			// 'featureFlag.syncMultiPut': {
			// 	value: false,
			// 	type: SettingItemType.Bool,
			// 	public: false,
			// 	storage: SettingStorage.File,
			// },

			'sync.allowUnsupportedProviders': {
				value: -1,
				type: SettingItemType.Int,
				public: false,
			},

			'sync.shareCache': {
				value: null,
				type: SettingItemType.String,
				public: false,
			},

			'voiceTypingBaseUrl': {
				value: '',
				type: SettingItemType.String,
				public: true,
				appTypes: [AppType.Mobile],
				description: () => _('Leave it blank to download the language files from the default website'),
				label: () => _('Voice typing language files (URL)'),
				section: 'note',
			},

			'trash.autoDeletionEnabled': {
				value: true,
				type: SettingItemType.Bool,
				public: true,
				label: () => _('Automatically delete notes in the trash after a number of days'),
				storage: SettingStorage.File,
				isGlobal: false,
			},

			'trash.ttlDays': {
				value: 90,
				type: SettingItemType.Int,
				public: true,
				minimum: 1,
				maximum: 300,
				step: 1,
				unitLabel: (value: number = null) => {
					return value === null ? _('days') : _('%d days', value);
				},
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				show: (settings: any) => settings['trash.autoDeletionEnabled'],
				label: () => _('Keep notes in the trash for'),
				storage: SettingStorage.File,
				isGlobal: false,
			},
		};

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

		this.cache_ = [];

		const pushItemsToCache = (items: CacheItem[]) => {
			for (let i = 0; i < items.length; i++) {
				const c = items[i];

				if (!this.keyExists(c.key)) continue;

				c.value = this.formatValue(c.key, c.value);
				c.value = this.filterValue(c.key, c.value);

				this.cache_.push(c);
			}
		};

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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static setConstant(key: string, value: any) {
		if (!(key in this.constants_)) throw new Error(`Unknown constant key: ${key}`);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		(this.constants_ as any)[key] = value;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static setValue(key: string, value: any) {
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

				if ('minimum' in md && value < md.minimum) value = md.minimum;
				if ('maximum' in md && value > md.maximum) value = md.maximum;

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

	public static value(key: string) {
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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static valueNoThrow(key: string, defaultValue: any) {
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
	public static subValues(baseKey: string, settings: any, options: any = null) {
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

		const queries = [];
		queries.push(`DELETE FROM settings WHERE key IN ("${keys.join('","')}")`);

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
				// As an optimisation, we check if the value exists on the keychain before writing it again.
				try {
					const passwordName = `setting.${s.key}`;
					const currentValue = await this.keychainService().password(passwordName);
					if (currentValue !== valueAsString) {
						const wasSet = await this.keychainService().setPassword(passwordName, valueAsString);
						if (wasSet) continue;
					} else {
						// The value is already in the keychain - so nothing to do
						// Make sure to `continue` here otherwise it will save the password
						// in clear text in the database.
						continue;
					}
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

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const output: any = {};
		for (const key in metadata) {
			if (!metadata.hasOwnProperty(key)) continue;
			const s = { ...metadata[key] };
			if (!s.public) continue;
			if (s.appTypes && s.appTypes.indexOf(appType) < 0) continue;
			s.value = this.value(key);
			output[key] = s;
		}
		return output;
	}

	public static typeToString(typeId: number) {
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
