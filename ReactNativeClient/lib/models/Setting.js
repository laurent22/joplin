const BaseModel = require('lib/BaseModel.js');
const { Database } = require('lib/database.js');
const SyncTargetRegistry = require('lib/SyncTargetRegistry.js');
const { time } = require('lib/time-utils.js');
const { sprintf } = require('sprintf-js');
const ObjectUtils = require('lib/ObjectUtils');
const { toTitleCase } = require('lib/string-utils.js');
const { rtrimSlashes, toSystemSlashes } = require('lib/path-utils.js');
const { _, supportedLocalesToLanguages, defaultLocale } = require('lib/locale.js');
const { shim } = require('lib/shim');

class Setting extends BaseModel {
	static tableName() {
		return 'settings';
	}

	static modelType() {
		return BaseModel.TYPE_SETTING;
	}

	static keychainService() {
		if (!this.keychainService_) throw new Error('keychainService has not been set!!');
		return this.keychainService_;
	}

	static setKeychainService(s) {
		this.keychainService_ = s;
	}

	static metadata() {
		if (this.metadata_) return this.metadata_;

		const platform = shim.platformName();
		const mobilePlatform = shim.mobilePlatform();

		let wysiwygYes = '';
		let wysiwygNo = '';
		if (shim.isElectron()) {
			wysiwygYes = ` ${_('(wysiwyg: %s)', _('yes'))}`;
			wysiwygNo = ` ${_('(wysiwyg: %s)', _('no'))}`;
		}

		const emptyDirWarning = _('Attention: If you change this location, make sure you copy all your content to it before syncing, otherwise all files will be removed! See the FAQ for more details: %s', 'https://joplinapp.org/faq/');

		// A "public" setting means that it will show up in the various config screens (or config command for the CLI tool), however
		// if if private a setting might still be handled and modified by the app. For instance, the settings related to sorting notes are not
		// public for the mobile and desktop apps because they are handled separately in menus.

		const themeOptions = () => {
			const output = {};
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

		this.metadata_ = {
			'clientId': {
				value: '',
				type: Setting.TYPE_STRING,
				public: false,
			},
			'editor.codeView': {
				value: true,
				type: Setting.TYPE_BOOL,
				public: false,
				appTypes: ['desktop'],
			},
			'sync.target': {
				value: SyncTargetRegistry.nameToId('dropbox'),
				type: Setting.TYPE_INT,
				isEnum: true,
				public: true,
				section: 'sync',
				label: () => _('Synchronisation target'),
				description: appType => {
					return appType !== 'cli' ? null : _('The target to synchonise to. Each sync target may have additional parameters which are named as `sync.NUM.NAME` (all documented below).');
				},
				options: () => {
					return SyncTargetRegistry.idAndLabelPlainObject(platform);
				},
			},

			'sync.upgradeState': {
				value: Setting.SYNC_UPGRADE_STATE_IDLE,
				type: Setting.TYPE_INT,
				public: false,
			},

			'sync.2.path': {
				value: '',
				type: Setting.TYPE_STRING,
				section: 'sync',
				show: settings => {
					try {
						return settings['sync.target'] == SyncTargetRegistry.nameToId('filesystem');
					} catch (error) {
						return false;
					}
				},
				filter: value => {
					return value ? rtrimSlashes(value) : '';
				},
				public: true,
				label: () => _('Directory to synchronise with (absolute path)'),
				description: () => emptyDirWarning,
			},

			'sync.5.path': {
				value: '',
				type: Setting.TYPE_STRING,
				section: 'sync',
				show: settings => {
					return settings['sync.target'] == SyncTargetRegistry.nameToId('nextcloud');
				},
				public: true,
				label: () => _('Nextcloud WebDAV URL'),
				description: () => emptyDirWarning,
			},
			'sync.5.username': {
				value: '',
				type: Setting.TYPE_STRING,
				section: 'sync',
				show: settings => {
					return settings['sync.target'] == SyncTargetRegistry.nameToId('nextcloud');
				},
				public: true,
				label: () => _('Nextcloud username'),
			},
			'sync.5.password': {
				value: '',
				type: Setting.TYPE_STRING,
				section: 'sync',
				show: settings => {
					return settings['sync.target'] == SyncTargetRegistry.nameToId('nextcloud');
				},
				public: true,
				label: () => _('Nextcloud password'),
				secure: true,
			},

			'sync.6.path': {
				value: '',
				type: Setting.TYPE_STRING,
				section: 'sync',
				show: settings => {
					return settings['sync.target'] == SyncTargetRegistry.nameToId('webdav');
				},
				public: true,
				label: () => _('WebDAV URL'),
				description: () => emptyDirWarning,
			},
			'sync.6.username': {
				value: '',
				type: Setting.TYPE_STRING,
				section: 'sync',
				show: settings => {
					return settings['sync.target'] == SyncTargetRegistry.nameToId('webdav');
				},
				public: true,
				label: () => _('WebDAV username'),
			},
			'sync.6.password': {
				value: '',
				type: Setting.TYPE_STRING,
				section: 'sync',
				show: settings => {
					return settings['sync.target'] == SyncTargetRegistry.nameToId('webdav');
				},
				public: true,
				label: () => _('WebDAV password'),
				secure: true,
			},

			'sync.8.path': {
				value: '',
				type: Setting.TYPE_STRING,
				section: 'sync',
				show: settings => {
					try {
						return settings['sync.target'] == SyncTargetRegistry.nameToId('amazon_s3');
					} catch (error) {
						return false;
					}
				},
				filter: value => {
					return value ? rtrimSlashes(value) : '';
				},
				public: true,
				label: () => _('AWS S3 bucket'),
				description: () => emptyDirWarning,
			},
			'sync.8.username': {
				value: '',
				type: Setting.TYPE_STRING,
				section: 'sync',
				show: settings => {
					return settings['sync.target'] == SyncTargetRegistry.nameToId('amazon_s3');
				},
				public: true,
				label: () => _('AWS key'),
			},
			'sync.8.password': {
				value: '',
				type: Setting.TYPE_STRING,
				section: 'sync',
				show: settings => {
					return settings['sync.target'] == SyncTargetRegistry.nameToId('amazon_s3');
				},
				public: true,
				label: () => _('AWS secret'),
				secure: true,
			},

			'sync.5.syncTargets': { value: {}, type: Setting.TYPE_OBJECT, public: false },

			'sync.resourceDownloadMode': {
				value: 'always',
				type: Setting.TYPE_STRING,
				section: 'sync',
				public: true,
				advanced: true,
				isEnum: true,
				appTypes: ['mobile', 'desktop'],
				label: () => _('Attachment download behaviour'),
				description: () => _('In "Manual" mode, attachments are downloaded only when you click on them. In "Auto", they are downloaded when you open the note. In "Always", all the attachments are downloaded whether you open the note or not.'),
				options: () => {
					return {
						always: _('Always'),
						manual: _('Manual'),
						auto: _('Auto'),
					};
				},
			},

			'sync.3.auth': { value: '', type: Setting.TYPE_STRING, public: false },
			'sync.4.auth': { value: '', type: Setting.TYPE_STRING, public: false },
			'sync.7.auth': { value: '', type: Setting.TYPE_STRING, public: false },
			'sync.1.context': { value: '', type: Setting.TYPE_STRING, public: false },
			'sync.2.context': { value: '', type: Setting.TYPE_STRING, public: false },
			'sync.3.context': { value: '', type: Setting.TYPE_STRING, public: false },
			'sync.4.context': { value: '', type: Setting.TYPE_STRING, public: false },
			'sync.5.context': { value: '', type: Setting.TYPE_STRING, public: false },
			'sync.6.context': { value: '', type: Setting.TYPE_STRING, public: false },
			'sync.7.context': { value: '', type: Setting.TYPE_STRING, public: false },
			'sync.8.context': { value: '', type: Setting.TYPE_STRING, public: false },

			'sync.maxConcurrentConnections': { value: 5, type: Setting.TYPE_INT, public: true, advanced: true, section: 'sync', label: () => _('Max concurrent connections'), minimum: 1, maximum: 20, step: 1 },

			activeFolderId: { value: '', type: Setting.TYPE_STRING, public: false },
			firstStart: { value: true, type: Setting.TYPE_BOOL, public: false },
			locale: {
				value: defaultLocale(),
				type: Setting.TYPE_STRING,
				isEnum: true,
				public: true,
				label: () => _('Language'),
				options: () => {
					return ObjectUtils.sortByValue(supportedLocalesToLanguages({ includeStats: true }));
				},
			},
			dateFormat: {
				value: Setting.DATE_FORMAT_1,
				type: Setting.TYPE_STRING,
				isEnum: true,
				public: true,
				label: () => _('Date format'),
				options: () => {
					const options = {};
					const now = new Date('2017-01-30T12:00:00').getTime();
					options[Setting.DATE_FORMAT_1] = time.formatMsToLocal(now, Setting.DATE_FORMAT_1);
					options[Setting.DATE_FORMAT_2] = time.formatMsToLocal(now, Setting.DATE_FORMAT_2);
					options[Setting.DATE_FORMAT_3] = time.formatMsToLocal(now, Setting.DATE_FORMAT_3);
					options[Setting.DATE_FORMAT_4] = time.formatMsToLocal(now, Setting.DATE_FORMAT_4);
					options[Setting.DATE_FORMAT_5] = time.formatMsToLocal(now, Setting.DATE_FORMAT_5);
					options[Setting.DATE_FORMAT_6] = time.formatMsToLocal(now, Setting.DATE_FORMAT_6);
					options[Setting.DATE_FORMAT_7] = time.formatMsToLocal(now, Setting.DATE_FORMAT_7);
					return options;
				},
			},
			timeFormat: {
				value: Setting.TIME_FORMAT_1,
				type: Setting.TYPE_STRING,
				isEnum: true,
				public: true,
				label: () => _('Time format'),
				options: () => {
					const options = {};
					const now = new Date('2017-01-30T20:30:00').getTime();
					options[Setting.TIME_FORMAT_1] = time.formatMsToLocal(now, Setting.TIME_FORMAT_1);
					options[Setting.TIME_FORMAT_2] = time.formatMsToLocal(now, Setting.TIME_FORMAT_2);
					return options;
				},
			},

			theme: {
				value: Setting.THEME_LIGHT,
				type: Setting.TYPE_INT,
				public: true,
				appTypes: ['mobile', 'desktop'],
				show: (settings) => {
					return !settings['themeAutoDetect'];
				},
				isEnum: true,
				label: () => _('Theme'),
				section: 'appearance',
				options: () => themeOptions(),
			},

			themeAutoDetect: {
				value: false,
				type: Setting.TYPE_BOOL,
				section: 'appearance',
				appTypes: ['desktop'],
				public: true,
				label: () => _('Automatically switch theme to match system theme'),
			},

			preferredLightTheme: {
				value: Setting.THEME_LIGHT,
				type: Setting.TYPE_INT,
				public: true,
				show: (settings) => {
					return settings['themeAutoDetect'];
				},
				appTypes: ['desktop'],
				isEnum: true,
				label: () => _('Preferred light theme'),
				section: 'appearance',
				options: () => themeOptions(),
			},

			preferredDarkTheme: {
				value: Setting.THEME_DARK,
				type: Setting.TYPE_INT,
				public: true,
				show: (settings) => {
					return settings['themeAutoDetect'];
				},
				appTypes: ['desktop'],
				isEnum: true,
				label: () => _('Preferred dark theme'),
				section: 'appearance',
				options: () => themeOptions(),
			},

			showNoteCounts: { value: true, type: Setting.TYPE_BOOL, public: false, advanced: true, appTypes: ['desktop'], label: () => _('Show note counts') },

			layoutButtonSequence: {
				value: Setting.LAYOUT_ALL,
				type: Setting.TYPE_INT,
				public: false,
				appTypes: ['desktop'],
				isEnum: true,
				options: () => ({
					[Setting.LAYOUT_ALL]: _('%s / %s / %s', _('Editor'), _('Viewer'), _('Split View')),
					[Setting.LAYOUT_EDITOR_VIEWER]: _('%s / %s', _('Editor'), _('Viewer')),
					[Setting.LAYOUT_EDITOR_SPLIT]: _('%s / %s', _('Editor'), _('Split View')),
					[Setting.LAYOUT_VIEWER_SPLIT]: _('%s / %s', _('Viewer'), _('Split View')),
				}),
			},
			uncompletedTodosOnTop: { value: true, type: Setting.TYPE_BOOL, section: 'note', public: true, appTypes: ['cli'], label: () => _('Uncompleted to-dos on top') },
			showCompletedTodos: { value: true, type: Setting.TYPE_BOOL, section: 'note', public: true, appTypes: ['cli'], label: () => _('Show completed to-dos') },
			'notes.sortOrder.field': {
				value: 'user_updated_time',
				type: Setting.TYPE_STRING,
				section: 'note',
				isEnum: true,
				public: true,
				appTypes: ['cli'],
				label: () => _('Sort notes by'),
				options: () => {
					const Note = require('lib/models/Note');
					const noteSortFields = ['user_updated_time', 'user_created_time', 'title', 'order'];
					const options = {};
					for (let i = 0; i < noteSortFields.length; i++) {
						options[noteSortFields[i]] = toTitleCase(Note.fieldToLabel(noteSortFields[i]));
					}
					return options;
				},
			},
			'editor.autoMatchingBraces': {
				value: true,
				type: Setting.TYPE_BOOL,
				public: true,
				section: 'note',
				appTypes: ['desktop'],
				label: () => _('Auto-pair braces, parenthesis, quotations, etc.'),
			},
			'editor.betaCodeMirror': {
				value: false,
				type: Setting.TYPE_BOOL,
				public: true,
				section: 'note',
				appTypes: ['desktop'],
				label: () => _('Use CodeMirror as the code editor (WARNING: BETA).'),
			},
			'notes.sortOrder.reverse': { value: true, type: Setting.TYPE_BOOL, section: 'note', public: true, label: () => _('Reverse sort order'), appTypes: ['cli'] },
			'folders.sortOrder.field': {
				value: 'title',
				type: Setting.TYPE_STRING,
				isEnum: true,
				public: true,
				appTypes: ['cli'],
				label: () => _('Sort notebooks by'),
				options: () => {
					const Folder = require('lib/models/Folder');
					const folderSortFields = ['title', 'last_note_user_updated_time'];
					const options = {};
					for (let i = 0; i < folderSortFields.length; i++) {
						options[folderSortFields[i]] = toTitleCase(Folder.fieldToLabel(folderSortFields[i]));
					}
					return options;
				},
			},
			'folders.sortOrder.reverse': { value: false, type: Setting.TYPE_BOOL, public: true, label: () => _('Reverse sort order'), appTypes: ['cli'] },
			trackLocation: { value: true, type: Setting.TYPE_BOOL, section: 'note', public: true, label: () => _('Save geo-location with notes') },

			'editor.beta': {
				value: false,
				type: Setting.TYPE_BOOL,
				section: 'note',
				public: true,
				appTypes: ['mobile'],
				label: () => 'Opt-in to the editor beta',
				description: () => 'This beta adds list continuation, Markdown preview, and Markdown shortcuts. If you find bugs, please report them in the Discourse forum.',
			},

			newTodoFocus: {
				value: 'title',
				type: Setting.TYPE_STRING,
				section: 'note',
				isEnum: true,
				public: true,
				appTypes: ['desktop'],
				label: () => _('When creating a new to-do:'),
				options: () => {
					return {
						title: _('Focus title'),
						body: _('Focus body'),
					};
				},
			},
			newNoteFocus: {
				value: 'body',
				type: Setting.TYPE_STRING,
				section: 'note',
				isEnum: true,
				public: true,
				appTypes: ['desktop'],
				label: () => _('When creating a new note:'),
				options: () => {
					return {
						title: _('Focus title'),
						body: _('Focus body'),
					};
				},
			},

			// Deprecated - use markdown.plugin.*
			'markdown.softbreaks': { value: false, type: Setting.TYPE_BOOL, public: false, appTypes: ['mobile', 'desktop'] },
			'markdown.typographer': { value: false, type: Setting.TYPE_BOOL, public: false, appTypes: ['mobile', 'desktop'] },
			// Deprecated

			'markdown.plugin.softbreaks': { value: false, type: Setting.TYPE_BOOL, section: 'plugins', public: true, appTypes: ['mobile', 'desktop'], label: () => `${_('Enable soft breaks')}${wysiwygYes}` },
			'markdown.plugin.typographer': { value: false, type: Setting.TYPE_BOOL, section: 'plugins', public: true, appTypes: ['mobile', 'desktop'], label: () => `${_('Enable typographer support')}${wysiwygYes}` },
			'markdown.plugin.katex': { value: true, type: Setting.TYPE_BOOL, section: 'plugins', public: true, appTypes: ['mobile', 'desktop'], label: () => `${_('Enable math expressions')}${wysiwygYes}` },
			'markdown.plugin.fountain': { value: false, type: Setting.TYPE_BOOL, section: 'plugins', public: true, appTypes: ['mobile', 'desktop'], label: () => `${_('Enable Fountain syntax support')}${wysiwygYes}` },
			'markdown.plugin.mermaid': { value: true, type: Setting.TYPE_BOOL, section: 'plugins', public: true, appTypes: ['mobile', 'desktop'], label: () => `${_('Enable Mermaid diagrams support')}${wysiwygYes}` },

			'markdown.plugin.mark': { value: true, type: Setting.TYPE_BOOL, section: 'plugins', public: true, appTypes: ['mobile', 'desktop'], label: () => `${_('Enable ==mark== syntax')}${wysiwygNo}` },
			'markdown.plugin.footnote': { value: true, type: Setting.TYPE_BOOL, section: 'plugins', public: true, appTypes: ['mobile', 'desktop'], label: () => `${_('Enable footnotes')}${wysiwygNo}` },
			'markdown.plugin.toc': { value: true, type: Setting.TYPE_BOOL, section: 'plugins', public: true, appTypes: ['mobile', 'desktop'], label: () => `${_('Enable table of contents extension')}${wysiwygNo}` },
			'markdown.plugin.sub': { value: false, type: Setting.TYPE_BOOL, section: 'plugins', public: true, appTypes: ['mobile', 'desktop'], label: () => `${_('Enable ~sub~ syntax')}${wysiwygNo}` },
			'markdown.plugin.sup': { value: false, type: Setting.TYPE_BOOL, section: 'plugins', public: true, appTypes: ['mobile', 'desktop'], label: () => `${_('Enable ^sup^ syntax')}${wysiwygNo}` },
			'markdown.plugin.deflist': { value: false, type: Setting.TYPE_BOOL, section: 'plugins', public: true, appTypes: ['mobile', 'desktop'], label: () => `${_('Enable deflist syntax')}${wysiwygNo}` },
			'markdown.plugin.abbr': { value: false, type: Setting.TYPE_BOOL, section: 'plugins', public: true, appTypes: ['mobile', 'desktop'], label: () => `${_('Enable abbreviation syntax')}${wysiwygNo}` },
			'markdown.plugin.emoji': { value: false, type: Setting.TYPE_BOOL, section: 'plugins', public: true, appTypes: ['mobile', 'desktop'], label: () => `${_('Enable markdown emoji')}${wysiwygNo}` },
			'markdown.plugin.insert': { value: false, type: Setting.TYPE_BOOL, section: 'plugins', public: true, appTypes: ['mobile', 'desktop'], label: () => `${_('Enable ++insert++ syntax')}${wysiwygNo}` },
			'markdown.plugin.multitable': { value: false, type: Setting.TYPE_BOOL, section: 'plugins', public: true, appTypes: ['mobile', 'desktop'], label: () => `${_('Enable multimarkdown table extension')}${wysiwygNo}` },

			// Tray icon (called AppIndicator) doesn't work in Ubuntu
			// http://www.webupd8.org/2017/04/fix-appindicator-not-working-for.html
			// Might be fixed in Electron 18.x but no non-beta release yet. So for now
			// by default we disable it on Linux.
			showTrayIcon: {
				value: platform !== 'linux',
				type: Setting.TYPE_BOOL,
				section: 'application',
				public: true,
				appTypes: ['desktop'],
				label: () => _('Show tray icon'),
				description: () => {
					return platform === 'linux' ? _('Note: Does not work in all desktop environments.') : _('This will allow Joplin to run in the background. It is recommended to enable this setting so that your notes are constantly being synchronised, thus reducing the number of conflicts.');
				},
			},

			startMinimized: { value: false, type: Setting.TYPE_BOOL, section: 'application', public: true, appTypes: ['desktop'], label: () => _('Start application minimised in the tray icon') },

			collapsedFolderIds: { value: [], type: Setting.TYPE_ARRAY, public: false },

			'keychain.supported': { value: -1, type: Setting.TYPE_INT, public: false },
			'db.ftsEnabled': { value: -1, type: Setting.TYPE_INT, public: false },
			'encryption.enabled': { value: false, type: Setting.TYPE_BOOL, public: false },
			'encryption.activeMasterKeyId': { value: '', type: Setting.TYPE_STRING, public: false },
			'encryption.passwordCache': { value: {}, type: Setting.TYPE_OBJECT, public: false, secure: true },
			'encryption.shouldReencrypt': {
				value: -1, // will be set on app startup
				type: Setting.TYPE_INT,
				public: false,
			},

			// Deprecated in favour of windowContentZoomFactor
			'style.zoom': { value: 100, type: Setting.TYPE_INT, public: false, appTypes: ['desktop'], section: 'appearance', label: () => '', minimum: 50, maximum: 500, step: 10 },

			'style.editor.fontSize': { value: 13, type: Setting.TYPE_INT, public: true, appTypes: ['desktop'], section: 'appearance', label: () => _('Editor font size'), minimum: 4, maximum: 50, step: 1 },
			'style.editor.fontFamily':
				(mobilePlatform) ?
					({
						value: Setting.FONT_DEFAULT,
						type: Setting.TYPE_STRING,
						isEnum: true,
						public: true,
						label: () => _('Editor font'),
						appTypes: ['mobile'],
						section: 'appearance',
						options: () => {
							// IMPORTANT: The font mapping must match the one in global-styles.js::editorFont()
							if (mobilePlatform === 'ios') {
								return {
									[Setting.FONT_DEFAULT]: 'Default',
									[Setting.FONT_MENLO]: 'Menlo',
									[Setting.FONT_COURIER_NEW]: 'Courier New',
									[Setting.FONT_AVENIR]: 'Avenir',
								};
							}
							return {
								[Setting.FONT_DEFAULT]: 'Default',
								[Setting.FONT_MONOSPACE]: 'Monospace',
							};
						},
					}) : {
						value: '',
						type: Setting.TYPE_STRING,
						public: true,
						appTypes: ['desktop'],
						section: 'appearance',
						label: () => _('Editor font family'),
						description: () =>
							_('This should be a *monospace* font or some elements will render incorrectly. If the font ' +
						'is incorrect or empty, it will default to a generic monospace font.'),
					},
			'style.sidebar.width': { value: 150, minimum: 80, maximum: 400, type: Setting.TYPE_INT, public: false, appTypes: ['desktop'] },
			'style.noteList.width': { value: 150, minimum: 80, maximum: 400, type: Setting.TYPE_INT, public: false, appTypes: ['desktop'] },

			// TODO: Is there a better way to do this? The goal here is to simply have
			// a way to display a link to the customizable stylesheets, not for it to
			// serve as a customizable Setting. But because the Setting page is auto-
			// generated from this list of settings, there wasn't a really elegant way
			// to do that directly in the React markup.
			'style.customCss.renderedMarkdown': {
				onClick: () => {
					const dir = Setting.value('profileDir');
					const filename = Setting.custom_css_files.RENDERED_MARKDOWN;
					const filepath = `${dir}/${filename}`;
					const defaultContents = '/* For styling the rendered Markdown */';

					shim.openOrCreateFile(filepath, defaultContents);
				},
				type: Setting.TYPE_BUTTON,
				public: true,
				appTypes: ['desktop'],
				label: () => _('Custom stylesheet for rendered Markdown'),
				section: 'appearance',
				advanced: true,
			},
			'style.customCss.joplinApp': {
				onClick: () => {
					const dir = Setting.value('profileDir');
					const filename = Setting.custom_css_files.JOPLIN_APP;
					const filepath = `${dir}/${filename}`;
					const defaultContents = `/* For styling the entire Joplin app (except the rendered Markdown, which is defined in \`${Setting.custom_css_files.RENDERED_MARKDOWN}\`) */`;

					shim.openOrCreateFile(filepath, defaultContents);
				},
				type: Setting.TYPE_BUTTON,
				public: true,
				appTypes: ['desktop'],
				label: () => _('Custom stylesheet for Joplin-wide app styles'),
				section: 'appearance',
				advanced: true,
				description: () => 'CSS file support is provided for your convenience, but they are advanced settings, and styles you define may break from one version to the next. If you want to use them, please know that it might require regular development work from you to keep them working. The Joplin team cannot make a commitment to keep the application HTML structure stable.',
			},

			autoUpdateEnabled: { value: true, type: Setting.TYPE_BOOL, section: 'application', public: true, appTypes: ['desktop'], label: () => _('Automatically update the application') },
			'autoUpdate.includePreReleases': { value: false, type: Setting.TYPE_BOOL, section: 'application', public: true, appTypes: ['desktop'], label: () => _('Get pre-releases when checking for updates'), description: () => _('See the pre-release page for more details: %s', 'https://joplinapp.org/prereleases') },
			'clipperServer.autoStart': { value: false, type: Setting.TYPE_BOOL, public: false },
			'sync.interval': {
				value: 300,
				type: Setting.TYPE_INT,
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
			},
			noteVisiblePanes: { value: ['editor', 'viewer'], type: Setting.TYPE_ARRAY, public: false, appTypes: ['desktop'] },
			sidebarVisibility: { value: true, type: Setting.TYPE_BOOL, public: false, appTypes: ['desktop'] },
			noteListVisibility: { value: true, type: Setting.TYPE_BOOL, public: false, appTypes: ['desktop'] },
			tagHeaderIsExpanded: { value: true, type: Setting.TYPE_BOOL, public: false, appTypes: ['desktop'] },
			folderHeaderIsExpanded: { value: true, type: Setting.TYPE_BOOL, public: false, appTypes: ['desktop'] },
			editor: { value: '', type: Setting.TYPE_STRING, subType: 'file_path_and_args', public: true, appTypes: ['cli', 'desktop'], label: () => _('Text editor command'), description: () => _('The editor command (may include arguments) that will be used to open a note. If none is provided it will try to auto-detect the default editor.') },
			'export.pdfPageSize': { value: 'A4', type: Setting.TYPE_STRING, advanced: true, isEnum: true, public: true, appTypes: ['desktop'], label: () => _('Page size for PDF export'), options: () => {
				return {
					'A4': _('A4'),
					'Letter': _('Letter'),
					'A3': _('A3'),
					'A5': _('A5'),
					'Tabloid': _('Tabloid'),
					'Legal': _('Legal'),
				};
			} },
			'export.pdfPageOrientation': { value: 'portrait', type: Setting.TYPE_STRING, advanced: true, isEnum: true, public: true, appTypes: ['desktop'], label: () => _('Page orientation for PDF export'), options: () => {
				return {
					'portrait': _('Portrait'),
					'landscape': _('Landscape'),
				};
			} },

			'editor.keyboardMode': {
				value: '',
				type: Setting.TYPE_STRING,
				public: true,
				appTypes: ['desktop'],
				isEnum: true,
				advanced: true,
				label: () => _('Keyboard Mode'),
				options: () => {
					const output = {};
					output[''] = _('Default');
					output['emacs'] = _('Emacs');
					output['vim'] = _('Vim');
					return output;
				},
			},

			'net.customCertificates': {
				value: '',
				type: Setting.TYPE_STRING,
				section: 'sync',
				advanced: true,
				show: settings => {
					return [SyncTargetRegistry.nameToId('nextcloud'), SyncTargetRegistry.nameToId('webdav')].indexOf(settings['sync.target']) >= 0;
				},
				public: true,
				appTypes: ['desktop', 'cli'],
				label: () => _('Custom TLS certificates'),
				description: () => _('Comma-separated list of paths to directories to load the certificates from, or path to individual cert files. For example: /my/cert_dir, /other/custom.pem. Note that if you make changes to the TLS settings, you must save your changes before clicking on "Check synchronisation configuration".'),
			},
			'net.ignoreTlsErrors': {
				value: false,
				type: Setting.TYPE_BOOL,
				advanced: true,
				section: 'sync',
				show: settings => {
					return [SyncTargetRegistry.nameToId('nextcloud'), SyncTargetRegistry.nameToId('webdav')].indexOf(settings['sync.target']) >= 0;
				},
				public: true,
				appTypes: ['desktop', 'cli'],
				label: () => _('Ignore TLS certificate errors'),
			},

			'sync.wipeOutFailSafe': {
				value: true,
				type: Setting.TYPE_BOOL,
				advanced: true,
				public: true,
				section: 'sync',
				label: () => _('Fail-safe'),
				description: () => _('Fail-safe: Do not wipe out local data when sync target is empty (often the result of a misconfiguration or bug)'),
			},

			'api.token': { value: null, type: Setting.TYPE_STRING, public: false },
			'api.port': { value: null, type: Setting.TYPE_INT, public: true, appTypes: ['cli'], description: () => _('Specify the port that should be used by the API server. If not set, a default will be used.') },

			'resourceService.lastProcessedChangeId': { value: 0, type: Setting.TYPE_INT, public: false },
			'searchEngine.lastProcessedChangeId': { value: 0, type: Setting.TYPE_INT, public: false },
			'revisionService.lastProcessedChangeId': { value: 0, type: Setting.TYPE_INT, public: false },

			'searchEngine.initialIndexingDone': { value: false, type: Setting.TYPE_BOOL, public: false },

			'revisionService.enabled': { section: 'revisionService', value: true, type: Setting.TYPE_BOOL, public: true, label: () => _('Enable note history') },
			'revisionService.ttlDays': {
				section: 'revisionService',
				value: 90,
				type: Setting.TYPE_INT,
				public: true,
				minimum: 1,
				maximum: 365 * 2,
				step: 1,
				unitLabel: (value = null) => {
					return value === null ? _('days') : _('%d days', value);
				},
				label: () => _('Keep note history for'),
			},
			'revisionService.intervalBetweenRevisions': { section: 'revisionService', value: 1000 * 60 * 10, type: Setting.TYPE_INT, public: false },
			'revisionService.oldNoteInterval': { section: 'revisionService', value: 1000 * 60 * 60 * 24 * 7, type: Setting.TYPE_INT, public: false },

			'welcome.wasBuilt': { value: false, type: Setting.TYPE_BOOL, public: false },
			'welcome.enabled': { value: true, type: Setting.TYPE_BOOL, public: false },

			'camera.type': { value: 0, type: Setting.TYPE_INT, public: false, appTypes: ['mobile'] },
			'camera.ratio': { value: '4:3', type: Setting.TYPE_STRING, public: false, appTypes: ['mobile'] },

			windowContentZoomFactor: {
				value: 100,
				type: Setting.TYPE_INT,
				public: false,
				appTypes: ['desktop'],
				minimum: 30,
				maximum: 300,
				step: 10,
			},

			'layout.folderList.factor': {
				value: 1,
				type: Setting.TYPE_INT,
				section: 'appearance',
				public: true,
				appTypes: ['cli'],
				label: () => _('Notebook list growth factor'),
				description: () =>
					_('The factor property sets how the item will grow or shrink ' +
				'to fit the available space in its container with respect to the other items. ' +
				'Thus an item with a factor of 2 will take twice as much space as an item with a factor of 1.' +
				'Restart app to see changes.'),
			},
			'layout.noteList.factor': {
				value: 1,
				type: Setting.TYPE_INT,
				section: 'appearance',
				public: true,
				appTypes: ['cli'],
				label: () => _('Note list growth factor'),
				description: () =>
					_('The factor property sets how the item will grow or shrink ' +
				'to fit the available space in its container with respect to the other items. ' +
				'Thus an item with a factor of 2 will take twice as much space as an item with a factor of 1.' +
				'Restart app to see changes.'),
			},
			'layout.note.factor': {
				value: 2,
				type: Setting.TYPE_INT,
				section: 'appearance',
				public: true,
				appTypes: ['cli'],
				label: () => _('Note area growth factor'),
				description: () =>
					_('The factor property sets how the item will grow or shrink ' +
				'to fit the available space in its container with respect to the other items. ' +
				'Thus an item with a factor of 2 will take twice as much space as an item with a factor of 1.' +
				'Restart app to see changes.'),
			},
		};

		return this.metadata_;
	}

	static settingMetadata(key) {
		const metadata = this.metadata();
		if (!(key in metadata)) throw new Error(`Unknown key: ${key}`);
		const output = Object.assign({}, metadata[key]);
		output.key = key;
		return output;
	}

	static keyExists(key) {
		return key in this.metadata();
	}

	static keyDescription(key, appType = null) {
		const md = this.settingMetadata(key);
		if (!md.description) return null;
		return md.description(appType);
	}

	static isSecureKey(key) {
		return this.metadata()[key] && this.metadata()[key].secure === true;
	}

	static keys(publicOnly = false, appType = null, options = null) {
		options = Object.assign({}, {
			secureOnly: false,
		}, options);

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

	static isPublic(key) {
		return this.keys(true).indexOf(key) >= 0;
	}

	// Low-level method to load a setting directly from the database. Should not be used in most cases.
	static loadOne(key) {
		return this.modelSelectOne('SELECT * FROM settings WHERE key = ?', [key]);
	}

	static load() {
		this.cancelScheduleSave();
		this.cache_ = [];
		return this.modelSelectAll('SELECT * FROM settings').then(async (rows) => {
			this.cache_ = [];

			const pushItemsToCache = (items) => {
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
			// are deleted from the database and transfered to the keychain in saveAll().

			const rowKeys = rows.map(r => r.key);
			const secureKeys = this.keys(false, null, { secureOnly: true });
			const secureItems = [];
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

			pushItemsToCache(rows);
			pushItemsToCache(secureItems);

			this.dispatchUpdateAll();
		});
	}

	static toPlainObject() {
		const keys = this.keys();
		const keyToValues = {};
		for (let i = 0; i < keys.length; i++) {
			keyToValues[keys[i]] = this.value(keys[i]);
		}
		return keyToValues;
	}

	static dispatchUpdateAll() {
		this.dispatch({
			type: 'SETTING_UPDATE_ALL',
			settings: this.toPlainObject(),
		});
	}

	static setConstant(key, value) {
		if (!(key in this.constants_)) throw new Error(`Unknown constant key: ${key}`);
		this.constants_[key] = value;
	}

	static setValue(key, value) {
		if (!this.cache_) throw new Error('Settings have not been initialized!');

		value = this.formatValue(key, value);
		value = this.filterValue(key, value);

		for (let i = 0; i < this.cache_.length; i++) {
			const c = this.cache_[i];
			if (c.key == key) {
				const md = this.settingMetadata(key);

				if (md.isEnum === true) {
					if (!this.isAllowedEnumOption(key, value)) {
						throw new Error(_('Invalid option value: "%s". Possible values are: %s.', value, this.enumOptionsDoc(key)));
					}
				}

				if (c.value === value) return;

				// Don't log this to prevent sensitive info (passwords, auth tokens...) to end up in logs
				// this.logger().info('Setting: ' + key + ' = ' + c.value + ' => ' + value);

				if ('minimum' in md && value < md.minimum) value = md.minimum;
				if ('maximum' in md && value > md.maximum) value = md.maximum;

				c.value = value;

				this.dispatch({
					type: 'SETTING_UPDATE_ONE',
					key: key,
					value: c.value,
				});

				this.scheduleSave();
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

		this.scheduleSave();
	}

	static incValue(key, inc) {
		return this.setValue(key, this.value(key) + inc);
	}

	static toggle(key) {
		return this.setValue(key, !this.value(key));
	}

	static setObjectKey(settingKey, objectKey, value) {
		let o = this.value(settingKey);
		if (typeof o !== 'object') o = {};
		o[objectKey] = value;
		this.setValue(settingKey, o);
	}

	static deleteObjectKey(settingKey, objectKey) {
		const o = this.value(settingKey);
		if (typeof o !== 'object') return;
		delete o[objectKey];
		this.setValue(settingKey, o);
	}

	static async deleteKeychainPasswords() {
		const secureKeys = this.keys(false, null, { secureOnly: true });
		for (const key of secureKeys) {
			await this.keychainService().deletePassword(`setting.${key}`);
		}
	}

	static valueToString(key, value) {
		const md = this.settingMetadata(key);
		value = this.formatValue(key, value);
		if (md.type == Setting.TYPE_INT) return value.toFixed(0);
		if (md.type == Setting.TYPE_BOOL) return value ? '1' : '0';
		if (md.type == Setting.TYPE_ARRAY) return value ? JSON.stringify(value) : '[]';
		if (md.type == Setting.TYPE_OBJECT) return value ? JSON.stringify(value) : '{}';
		if (md.type == Setting.TYPE_STRING) return value ? `${value}` : '';

		throw new Error(`Unhandled value type: ${md.type}`);
	}

	static filterValue(key, value) {
		const md = this.settingMetadata(key);
		return md.filter ? md.filter(value) : value;
	}

	static formatValue(key, value) {
		const md = this.settingMetadata(key);

		if (md.type == Setting.TYPE_INT) return !value ? 0 : Math.floor(Number(value));

		if (md.type == Setting.TYPE_BOOL) {
			if (typeof value === 'string') {
				value = value.toLowerCase();
				if (value === 'true') return true;
				if (value === 'false') return false;
				value = Number(value);
			}
			return !!value;
		}

		if (md.type === Setting.TYPE_ARRAY) {
			if (!value) return [];
			if (Array.isArray(value)) return value;
			if (typeof value === 'string') return JSON.parse(value);
			return [];
		}

		if (md.type === Setting.TYPE_OBJECT) {
			if (!value) return {};
			if (typeof value === 'object') return value;
			if (typeof value === 'string') return JSON.parse(value);
			return {};
		}

		if (md.type === Setting.TYPE_STRING) {
			if (!value) return '';
			return `${value}`;
		}

		throw new Error(`Unhandled value type: ${md.type}`);
	}

	static value(key) {
		// Need to copy arrays and objects since in setValue(), the old value and new one is compared
		// with strict equality and the value is updated only if changed. However if the caller acquire
		// and object and change a key, the objects will be detected as equal. By returning a copy
		// we avoid this problem.
		function copyIfNeeded(value) {
			if (value === null || value === undefined) return value;
			if (Array.isArray(value)) return value.slice();
			if (typeof value === 'object') return Object.assign({}, value);
			return value;
		}

		if (key in this.constants_) {
			const v = this.constants_[key];
			const output = typeof v === 'function' ? v() : v;
			if (output == 'SET_ME') throw new Error(`SET_ME constant has not been set: ${key}`);
			return output;
		}

		if (!this.cache_) throw new Error('Settings have not been initialized!');

		for (let i = 0; i < this.cache_.length; i++) {
			if (this.cache_[i].key == key) {
				return copyIfNeeded(this.cache_[i].value);
			}
		}

		const md = this.settingMetadata(key);
		return copyIfNeeded(md.value);
	}

	static isEnum(key) {
		const md = this.settingMetadata(key);
		return md.isEnum === true;
	}

	static enumOptionValues(key) {
		const options = this.enumOptions(key);
		const output = [];
		for (const n in options) {
			if (!options.hasOwnProperty(n)) continue;
			output.push(n);
		}
		return output;
	}

	static enumOptionLabel(key, value) {
		const options = this.enumOptions(key);
		for (const n in options) {
			if (n == value) return options[n];
		}
		return '';
	}

	static enumOptions(key) {
		const metadata = this.metadata();
		if (!metadata[key]) throw new Error(`Unknown key: ${key}`);
		if (!metadata[key].options) throw new Error(`No options for: ${key}`);
		return metadata[key].options();
	}

	static enumOptionsDoc(key, templateString = null) {
		if (templateString === null) templateString = '%s: %s';
		const options = this.enumOptions(key);
		const output = [];
		for (const n in options) {
			if (!options.hasOwnProperty(n)) continue;
			output.push(sprintf(templateString, n, options[n]));
		}
		return output.join(', ');
	}

	static isAllowedEnumOption(key, value) {
		const options = this.enumOptions(key);
		return !!options[value];
	}

	// For example, if settings is:
	// { sync.5.path: 'http://example', sync.5.username: 'testing' }
	// and baseKey is 'sync.5', the function will return
	// { path: 'http://example', username: 'testing' }
	static subValues(baseKey, settings, options = null) {
		const includeBaseKeyInName = !!options && !!options.includeBaseKeyInName;

		const output = {};
		for (const key in settings) {
			if (!settings.hasOwnProperty(key)) continue;
			if (key.indexOf(baseKey) === 0) {
				const subKey = includeBaseKeyInName ? key : key.substr(baseKey.length + 1);
				output[subKey] = settings[key];
			}
		}
		return output;
	}

	static async saveAll() {
		if (Setting.autoSaveEnabled && !this.saveTimeoutId_) return Promise.resolve();

		this.logger().info('Saving settings...');
		clearTimeout(this.saveTimeoutId_);
		this.saveTimeoutId_ = null;

		const queries = [];
		queries.push('DELETE FROM settings');
		for (let i = 0; i < this.cache_.length; i++) {
			const s = Object.assign({}, this.cache_[i]);
			s.value = this.valueToString(s.key, s.value);

			if (this.isSecureKey(s.key)) {
				// We need to be careful here because there's a bug in the macOS keychain that can
				// make it fail to save a password. https://github.com/desktop/desktop/issues/3263
				// So we try to set it and if it fails, we set it on the database instead. This is not
				// ideal because they won't be crypted, but better than losing all the user's passwords.
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
					if (currentValue !== s.value) {
						const wasSet = await this.keychainService().setPassword(passwordName, s.value);
						if (wasSet) continue;
					}
				} catch (error) {
					this.logger().error(`Could not set setting on the keychain. Will be saved to database instead: ${s.key}:`, error);
				}
			}

			queries.push(Database.insertQuery(this.tableName(), s));
		}

		await BaseModel.db().transactionExecBatch(queries);

		this.logger().info('Settings have been saved.');
	}

	static scheduleSave() {
		if (!Setting.autoSaveEnabled) return;

		if (this.saveTimeoutId_) clearTimeout(this.saveTimeoutId_);

		this.saveTimeoutId_ = setTimeout(async () => {
			try {
				await this.saveAll();
			} catch (error) {
				this.logger().error('Could not save settings', error);
			}
		}, 500);
	}

	static cancelScheduleSave() {
		if (this.saveTimeoutId_) clearTimeout(this.saveTimeoutId_);
		this.saveTimeoutId_ = null;
	}

	static publicSettings(appType) {
		if (!appType) throw new Error('appType is required');

		const metadata = this.metadata();

		const output = {};
		for (const key in metadata) {
			if (!metadata.hasOwnProperty(key)) continue;
			const s = Object.assign({}, metadata[key]);
			if (!s.public) continue;
			if (s.appTypes && s.appTypes.indexOf(appType) < 0) continue;
			s.value = this.value(key);
			output[key] = s;
		}
		return output;
	}

	static typeToString(typeId) {
		if (typeId === Setting.TYPE_INT) return 'int';
		if (typeId === Setting.TYPE_STRING) return 'string';
		if (typeId === Setting.TYPE_BOOL) return 'bool';
		if (typeId === Setting.TYPE_ARRAY) return 'array';
		if (typeId === Setting.TYPE_OBJECT) return 'object';
	}

	static groupMetadatasBySections(metadatas) {
		const sections = [];
		const generalSection = { name: 'general', metadatas: [] };
		const nameToSections = {};
		nameToSections['general'] = generalSection;
		sections.push(generalSection);
		for (let i = 0; i < metadatas.length; i++) {
			const md = metadatas[i];
			if (!md.section) {
				generalSection.metadatas.push(md);
			} else {
				if (!nameToSections[md.section]) {
					nameToSections[md.section] = { name: md.section, metadatas: [] };
					sections.push(nameToSections[md.section]);
				}
				nameToSections[md.section].metadatas.push(md);
			}
		}
		return sections;
	}

	static sectionNameToLabel(name) {
		if (name === 'general') return _('General');
		if (name === 'sync') return _('Synchronisation');
		if (name === 'appearance') return _('Appearance');
		if (name === 'note') return _('Note');
		if (name === 'plugins') return _('Plugins');
		if (name === 'application') return _('Application');
		if (name === 'revisionService') return _('Note History');
		if (name === 'encryption') return _('Encryption');
		if (name === 'server') return _('Web Clipper');
		return name;
	}

	static sectionDescription(name) {
		if (name === 'plugins') return _('These plugins enhance the Markdown renderer with additional features. Please note that, while these features might be useful, they are not standard Markdown and thus most of them will only work in Joplin. Additionally, some of them are *incompatible* with the WYSIWYG editor. If you open a note that uses one of these plugins in that editor, you will lose the plugin formatting. It is indicated below which plugins are compatible or not with the WYSIWYG editor.');
		if (name === 'general') return _('Notes and settings are stored in: %s', toSystemSlashes(this.value('profileDir'), process.platform));
		return '';
	}

	static sectionNameToIcon(name) {
		if (name === 'general') return 'fas fa-sliders-h';
		if (name === 'sync') return 'fas fa-sync-alt';
		if (name === 'appearance') return 'fas fa-pencil-alt';
		if (name === 'note') return 'far fa-file-alt';
		if (name === 'plugins') return 'fas fa-puzzle-piece';
		if (name === 'application') return 'fas fa-cog';
		if (name === 'revisionService') return 'fas fa-history';
		if (name === 'encryption') return 'fas fa-key';
		if (name === 'server') return 'far fa-hand-scissors';
		return name;
	}

	static appTypeToLabel(name) {
		// Not translated for now because only used on Welcome notes (which are not translated)
		if (name === 'cli') return 'CLI';
		return name[0].toUpperCase() + name.substr(1).toLowerCase();
	}
}

Setting.TYPE_INT = 1;
Setting.TYPE_STRING = 2;
Setting.TYPE_BOOL = 3;
Setting.TYPE_ARRAY = 4;
Setting.TYPE_OBJECT = 5;
Setting.TYPE_BUTTON = 6;

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

Setting.DATE_FORMAT_1 = 'DD/MM/YYYY';
Setting.DATE_FORMAT_2 = 'DD/MM/YY';
Setting.DATE_FORMAT_3 = 'MM/DD/YYYY';
Setting.DATE_FORMAT_4 = 'MM/DD/YY';
Setting.DATE_FORMAT_5 = 'YYYY-MM-DD';
Setting.DATE_FORMAT_6 = 'DD.MM.YYYY';
Setting.DATE_FORMAT_7 = 'YYYY.MM.DD';

Setting.TIME_FORMAT_1 = 'HH:mm';
Setting.TIME_FORMAT_2 = 'h:mm A';

Setting.SHOULD_REENCRYPT_NO = 0; // Data doesn't need to be re-encrypted
Setting.SHOULD_REENCRYPT_YES = 1; // Data should be re-encrypted
Setting.SHOULD_REENCRYPT_NOTIFIED = 2; // Data should be re-encrypted, and user has been notified

Setting.SYNC_UPGRADE_STATE_IDLE = 0; // Doesn't need to be upgraded
Setting.SYNC_UPGRADE_STATE_SHOULD_DO = 1; // Should be upgraded, but waiting for user to confirm
Setting.SYNC_UPGRADE_STATE_MUST_DO = 2; // Must be upgraded - on next restart, the upgrade will start

Setting.custom_css_files = {
	JOPLIN_APP: 'userchrome.css',
	RENDERED_MARKDOWN: 'userstyle.css',
};


// Contains constants that are set by the application and
// cannot be modified by the user:
Setting.constants_ = {
	env: 'SET_ME',
	isDemo: false,
	appName: 'joplin',
	appId: 'SET_ME', // Each app should set this identifier
	appType: 'SET_ME', // 'cli' or 'mobile'
	resourceDirName: '',
	resourceDir: '',
	profileDir: '',
	templateDir: '',
	tempDir: '',
	flagOpenDevTools: false,
	syncVersion: 2,
};

Setting.autoSaveEnabled = true;

module.exports = Setting;
