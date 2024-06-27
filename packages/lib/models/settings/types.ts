import type { BuiltInMetadataValues } from './builtInMetadata';

export enum SettingItemType {
	Int = 1,
	String = 2,
	Bool = 3,
	Array = 4,
	Object = 5,
	Button = 6,
}

export enum SettingItemSubType {
	FilePathAndArgs = 'file_path_and_args',
	FilePath = 'file_path', // Not supported on mobile!
	DirectoryPath = 'directory_path', // Not supported on mobile!
	FontFamily = 'font_family',
	MonospaceFontFamily = 'monospace_font_family',
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
	description?: (_appType: AppType)=> string;
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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Partially refactored old code before rule was applied
	unitLabel?: (value: any)=> string;
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

export type SettingsRecord = BuiltInMetadataValues & { [key: string]: unknown };
