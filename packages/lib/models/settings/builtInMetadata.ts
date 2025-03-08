import { rtrimSlashes } from '@joplin/utils/path';
import SyncTargetRegistry from '../../SyncTargetRegistry';
import { _, defaultLocale, supportedLocalesToLanguages } from '../../locale';
import shim from '../../shim';
import time from '../../time';
import type SettingType from '../Setting';
import { AppType, SettingItemSubType, SettingItemType, SettingStorage, SyncStartupOperation, SettingItem } from './types';
import { defaultListColumns } from '../../services/plugins/api/noteListType';
import type { PluginSettings } from '../../services/plugins/PluginService';
const ObjectUtils = require('../../ObjectUtils');
const { toTitleCase } = require('../../string-utils.js');

const customCssFilePath = (Setting: typeof SettingType, filename: string): string => {
	return `${Setting.value('rootProfileDir')}/${filename}`;
};

export enum CameraDirection {
	Back,
	Front,
}

export enum ScrollbarSize {
	Small = 7,
	Medium = 12,
	Large = 24,
}

const builtInMetadata = (Setting: typeof SettingType) => {
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

	const output = {
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
			value: null as boolean,
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

		'sync.10.userEmail': { value: '', type: SettingItemType.String, public: false },

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
		'editor.pluginCompatibilityBannerDismissedFor': {
			value: [] as string[], // List of plugin IDs
			type: SettingItemType.Array,
			storage: SettingStorage.File,
			isGlobal: true,
			public: false,
		},

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
			value: true,
			type: SettingItemType.Bool,
			public: true,
			appTypes: [AppType.Desktop],
			label: () => _('Enable optical character recognition (OCR)'),
			description: () => _('When enabled, the application will scan your attachments and extract the text from it. This will allow you to search for text in these attachments.'),
			storage: SettingStorage.File,
			isGlobal: true,
		},

		'ocr.languageDataPath': {
			value: '',
			type: SettingItemType.String,
			advanced: true,
			public: true,
			appTypes: [AppType.Desktop],
			label: () => _('OCR: Language data URL or path'),
			storage: SettingStorage.File,
			isGlobal: true,
		},

		'ocr.clearLanguageDataCache': {
			value: false,
			type: SettingItemType.Bool,
			public: false,
			appTypes: [AppType.Desktop],
			storage: SettingStorage.Database,
		},

		'ocr.clearLanguageDataCacheButton': {
			value: null as null,
			type: SettingItemType.Button,
			advanced: true,
			public: true,
			appTypes: [AppType.Desktop],
			label: () => _('OCR: Clear cache and re-download language data files'),
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
			value: true,
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
				const Note = require('../Note').default;
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
		'editor.autocompleteMarkup': {
			value: true,
			advanced: true,
			type: SettingItemType.Bool,
			public: true,
			section: 'note',
			appTypes: [AppType.Desktop, AppType.Mobile],
			label: () => _('Autocomplete Markdown and HTML'),
			description: () => _('Enables Markdown list continuation, auto-closing HTML tags, and other markup autocompletions.'),
			storage: SettingStorage.File,
			isGlobal: true,
		},
		'editor.pastePreserveColors': {
			value: false,
			type: SettingItemType.Bool,
			public: true,
			section: 'note',
			appTypes: [AppType.Desktop],
			label: () => _('Preserve colours when pasting text in Rich Text Editor'),
			storage: SettingStorage.File,
			isGlobal: true,
		},
		'editor.toolbarButtons': {
			value: [] as string[],
			public: false,
			type: SettingItemType.Array,
			storage: SettingStorage.File,
			isGlobal: true,
			appTypes: [AppType.Mobile],
			label: () => 'buttons included in the editor toolbar',
		},
		'editor.tabMovesFocus': {
			value: false,
			type: SettingItemType.Bool,
			public: false,
			section: 'note',
			appTypes: [AppType.Desktop],
			label: () => _('Tab moves focus'),
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
			value: {} as Record<string, string | boolean>,
			type: SettingItemType.Object,
			storage: SettingStorage.File,
			section: 'folder',
			public: false,
			appTypes: [AppType.Cli, AppType.Desktop],
		},
		'notes.sharedSortOrder': {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Partially refactored old code from before rule was applied.
			value: {} as Record<string, any>,
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
				const Folder = require('../Folder').default;
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
			value: {} as PluginSettings,
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
				// Hide on web -- debugging is enabled anyway, so this is not necessary.
				return shim.mobilePlatform() === 'android' && settings['plugins.pluginSupportEnabled'];
			},
			needRestart: true,
			advanced: true,

			label: () => _('Plugin WebView debugging'),
			description: () => _('Allows debugging mobile plugins. See %s for details.', 'https://joplinapp.org/help/api/references/mobile_plugin_debugging/'),
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
			appTypes: [AppType.Desktop, AppType.Mobile],
			// For now, development plugins are only enabled on desktop & web.
			show: (settings) => {
				if (shim.isElectron()) return true;
				if (shim.mobilePlatform() !== 'web') return false;

				const pluginSupportEnabled = settings['plugins.pluginSupportEnabled'];
				return !!pluginSupportEnabled;
			},
			label: () => 'Development plugins',
			description: () => {
				if (shim.mobilePlatform()) {
					return 'The path to a plugin\'s development directory. When the plugin is rebuilt, Joplin reloads the plugin automatically.';
				} else {
					return 'You may add multiple plugin paths, each separated by a comma. You will need to restart the application for the changes to take effect.';
				}
			},
			storage: SettingStorage.File,
		},

		'plugins.shownEditorViewIds': {
			value: [] as string[],
			type: SettingItemType.Array,
			public: false,
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

		// For now, applies only to the Markdown viewer
		'renderer.fileUrls': {
			storage: SettingStorage.File,
			isGlobal: true,
			value: false,
			type: SettingItemType.Bool,
			section: 'markdownPlugins',
			public: true,
			appTypes: [AppType.Desktop],
			label: () => `${_('Enable file:// URLs for images and videos')}${wysiwygYes}`,
		},

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

		collapsedFolderIds: { value: [] as string[], type: SettingItemType.Array, public: false },

		'keychain.supported': { value: -1, type: SettingItemType.Int, public: false },
		'keychain.lastAvailableDrivers': { value: [] as string[], type: SettingItemType.Array, public: false },
		'db.ftsEnabled': { value: -1, type: SettingItemType.Int, public: false },
		'db.fuzzySearchEnabled': { value: -1, type: SettingItemType.Int, public: false },
		'encryption.enabled': { value: false, type: SettingItemType.Bool, public: false },
		'encryption.activeMasterKeyId': { value: '', type: SettingItemType.String, public: false },
		'encryption.passwordCache': {
			value: {} as Record<string, string>,
			type: SettingItemType.Object,
			public: false,
			secure: true,
		},
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

		'style.viewer.fontSize': {
			value: 16,
			type: SettingItemType.Int,
			public: true,
			storage: SettingStorage.File,
			isGlobal: true,
			appTypes: [AppType.Mobile],
			section: 'appearance',
			label: () => _('Viewer font size'),
			minimum: 4,
			maximum: 50,
			step: 1,
		},

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

		'style.scrollbarSize': {
			value: ScrollbarSize.Small,
			type: SettingItemType.String,
			public: true,
			section: 'appearance',
			appTypes: [AppType.Desktop],
			isEnum: true,

			options: () => ({
				[ScrollbarSize.Small]: _('Small'),
				[ScrollbarSize.Medium]: _('Medium'),
				[ScrollbarSize.Large]: _('Large'),
			}),

			label: () => _('Scrollbar size'),
			description: () => _('Configures the size of scrollbars used in the app.'),
			storage: SettingStorage.File,
			isGlobal: true,
		},

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
			value: null as string|null,
			onClick: () => {
				shim.openOrCreateFile(
					customCssFilePath(Setting, Setting.customCssFilenames.RENDERED_MARKDOWN),
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
			value: null as string,
			onClick: () => {
				shim.openOrCreateFile(
					customCssFilePath(Setting, Setting.customCssFilenames.JOPLIN_APP),
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
			value: null as null,
			type: SettingItemType.Button,
			public: true,
			appTypes: [AppType.Desktop],
			label: () => _('Re-upload local data to sync target'),
			section: 'sync',
			advanced: true,
			description: () => 'If the data on the sync target is incorrect or empty, you can use this button to force a re-upload of your data to the sync target. Application will have to be restarted',
		},

		'sync.clearLocalDataButton': {
			value: null as null,
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
			label: () => _('Enable spell checking in Markdown editor'),
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
			public: false,
			appTypes: [AppType.Desktop],
			label: () => 'Opt-in to the editor beta',
			description: () => 'Currently unused',
			storage: SettingStorage.File,
			isGlobal: true,
		},

		'editor.legacyMarkdown': {
			advanced: true,
			value: false,
			type: SettingItemType.Bool,
			section: 'general',
			public: true,
			appTypes: [AppType.Desktop],
			label: () => _('Use the legacy Markdown editor'),
			description: () => 'Enable the the legacy Markdown editor. Some plugins require this editor to function. However, it has accessibility issues and other plugins will not work.',
			storage: SettingStorage.File,
			isGlobal: true,
		},

		'linking.extraAllowedExtensions': {
			value: [] as string[],
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

		'api.token': {
			value: null as string|null,
			type: SettingItemType.String,
			public: false,
			storage: SettingStorage.File,
			isGlobal: true,
		},
		'api.port': {
			value: null as number|null,
			type: SettingItemType.Int,
			storage: SettingStorage.File,
			isGlobal: true,
			public: true,
			appTypes: [AppType.Cli],
			description: () => _('Specify the port that should be used by the API server. If not set, a default will be used.'),
		},

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

		'camera.type': { value: CameraDirection.Back, type: SettingItemType.Int, public: false, appTypes: [AppType.Mobile] },
		'camera.ratio': { value: '4:3', type: SettingItemType.String, public: false, appTypes: [AppType.Mobile] },

		'spellChecker.enabled': { value: true, type: SettingItemType.Bool, isGlobal: true, storage: SettingStorage.File, public: false },
		'spellChecker.language': { value: '', type: SettingItemType.String, isGlobal: true, storage: SettingStorage.File, public: false }, // Depreciated in favour of spellChecker.languages.
		'spellChecker.languages': { value: [] as string[], type: SettingItemType.Array, isGlobal: true, storage: SettingStorage.File, public: false },

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
			value: [] as string[],
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
			label: () => `${_('Use biometrics to secure access to the app')}${shim.mobilePlatform() !== 'ios' ? ' (Beta)' : ''}`,
			description: () => 'Important: This is a beta feature and it is not compatible with certain devices. If the app no longer starts after enabling this or is very slow to start, please uninstall and reinstall the app.',
			show: () => shim.mobilePlatform() !== 'web',
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

		'featureFlag.autoUpdaterServiceEnabled': {
			value: false,
			type: SettingItemType.Bool,
			public: true,
			storage: SettingStorage.File,
			appTypes: [AppType.Desktop],
			label: () => 'Enable auto-updates',
			description: () => 'Enable this feature to receive notifications about updates and install them instead of manually downloading them. Restart app to start receiving auto-updates.',
			show: () => shim.isWindows(),
			section: 'application',
			isGlobal: true,
		},

		'featureFlag.linuxKeychain': {
			value: false,
			type: SettingItemType.Bool,
			public: true,
			storage: SettingStorage.File,
			appTypes: [AppType.Desktop],
			label: () => 'Enable keychain support',
			description: () => 'This is an experimental setting to enable keychain support on Linux',
			show: () => shim.isLinux(),
			section: 'general',
			isGlobal: true,
			advanced: true,
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

		'featureFlag.useBetaEncryptionMethod': {
			value: false,
			type: SettingItemType.Bool,
			public: true,
			storage: SettingStorage.File,
			label: () => 'Use beta encryption',
			description: () => 'Set beta encryption methods as the default methods. This applies to all clients and takes effect after restarting the app.',
			section: 'sync',
			isGlobal: true,
		},

		'sync.allowUnsupportedProviders': {
			value: -1,
			type: SettingItemType.Int,
			public: false,
		},

		'sync.shareCache': {
			value: null as string|null,
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
			// For now, iOS and web don't support voice typing.
			show: () => shim.mobilePlatform() === 'android',
			section: 'note',
		},

		'voiceTyping.preferredProvider': {
			value: 'whisper-tiny',
			type: SettingItemType.String,
			public: true,
			appTypes: [AppType.Mobile],
			label: () => _('Preferred voice typing provider'),
			isEnum: true,
			// For now, iOS and web don't support voice typing.
			show: () => shim.mobilePlatform() === 'android',
			section: 'note',

			options: () => {
				return {
					'vosk': _('Vosk'),
					'whisper-tiny': _('Whisper'),
				};
			},
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
	} satisfies Record<string, SettingItem>;

	for (const [key, md] of Object.entries(output)) {
		if (key.startsWith('featureFlag.')) (md as SettingItem).advanced = true;
	}

	return output;
};

export type BuiltInMetadataKeys = keyof ReturnType<typeof builtInMetadata>;
export type BuiltInMetadataValues = {
	[key in BuiltInMetadataKeys]: ReturnType<typeof builtInMetadata>[key]['value'];
};

export default builtInMetadata;
