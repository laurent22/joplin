const BaseModel = require('lib/BaseModel.js');
const { Database } = require('lib/database.js');
const { Logger } = require('lib/logger.js');
const SyncTargetRegistry = require('lib/SyncTargetRegistry.js');
const { time } = require('lib/time-utils.js');
const { sprintf } = require('sprintf-js');
const ObjectUtils = require('lib/ObjectUtils');
const { toTitleCase } = require('lib/string-utils.js');
const { _, supportedLocalesToLanguages, defaultLocale } = require('lib/locale.js');

class Setting extends BaseModel {

	static tableName() {
		return 'settings';
	}

	static modelType() {
		return BaseModel.TYPE_SETTING;
	}

	static metadata() {
		if (this.metadata_) return this.metadata_;

		// A "public" setting means that it will show up in the various config screens (or config command for the CLI tool), however
		// if if private a setting might still be handled and modified by the app. For instance, the settings related to sorting notes are not
		// public for the mobile and desktop apps because they are handled separately in menus.

		this.metadata_ = {
			'activeFolderId': { value: '', type: Setting.TYPE_STRING, public: false },
			'firstStart': { value: true, type: Setting.TYPE_BOOL, public: false },
			'editor': { value: '', type: Setting.TYPE_STRING, public: true, appTypes: ['cli'], label: () => _('Text editor'), description: () => _('The editor that will be used to open a note. If none is provided it will try to auto-detect the default editor.') },
			'locale': { value: defaultLocale(), type: Setting.TYPE_STRING, isEnum: true, public: true, label: () => _('Language'), options: () => {
				return ObjectUtils.sortByValue(supportedLocalesToLanguages());
			}},
			'dateFormat': { value: Setting.DATE_FORMAT_1, type: Setting.TYPE_STRING, isEnum: true, public: true, label: () => _('Date format'), options: () => {
				let options = {}
				const now = (new Date('2017-01-30T12:00:00')).getTime();
				options[Setting.DATE_FORMAT_1] = time.formatMsToLocal(now, Setting.DATE_FORMAT_1);
				options[Setting.DATE_FORMAT_2] = time.formatMsToLocal(now, Setting.DATE_FORMAT_2);
				options[Setting.DATE_FORMAT_3] = time.formatMsToLocal(now, Setting.DATE_FORMAT_3);
				options[Setting.DATE_FORMAT_4] = time.formatMsToLocal(now, Setting.DATE_FORMAT_4);
				options[Setting.DATE_FORMAT_5] = time.formatMsToLocal(now, Setting.DATE_FORMAT_5);
				return options;
			}},
			'timeFormat': { value: Setting.TIME_FORMAT_1, type: Setting.TYPE_STRING, isEnum: true, public: true, label: () => _('Time format'), options: () => {
				let options = {}
				const now = (new Date('2017-01-30T20:30:00')).getTime();
				options[Setting.TIME_FORMAT_1] = time.formatMsToLocal(now, Setting.TIME_FORMAT_1);
				options[Setting.TIME_FORMAT_2] = time.formatMsToLocal(now, Setting.TIME_FORMAT_2);
				return options;
			}},
			'theme': { value: Setting.THEME_LIGHT, type: Setting.TYPE_INT, public: true, appTypes: ['mobile'], isEnum: true, label: () => _('Theme'), options: () => {
				let output = {};
				output[Setting.THEME_LIGHT] = _('Light');
				output[Setting.THEME_DARK] = _('Dark');
				return output;
			}},
			'uncompletedTodosOnTop': { value: true, type: Setting.TYPE_BOOL, public: true, appTypes: ['cli'], label: () => _('Uncompleted to-dos on top') },
			'notes.sortOrder.field': { value: 'user_updated_time', type: Setting.TYPE_STRING, isEnum: true, public: true, appTypes: ['cli'], label: () => _('Sort notes by'), options: () => {
				const Note = require('lib/models/Note');
				const noteSortFields = ['user_updated_time', 'user_created_time', 'title'];
				const options = {};
				for (let i = 0; i < noteSortFields.length; i++) {
					options[noteSortFields[i]] = toTitleCase(Note.fieldToLabel(noteSortFields[i]));
				}
				return options;
			}},
			'notes.sortOrder.reverse': { value: true, type: Setting.TYPE_BOOL, public: true, label: () => _('Reverse sort order'), appTypes: ['cli'] },
			'trackLocation': { value: true, type: Setting.TYPE_BOOL, public: true, label: () => _('Save geo-location with notes') },
			'newTodoFocus': { value: 'title', type: Setting.TYPE_STRING, isEnum: true, public: true, appTypes: ['desktop'], label: () => _('When creating a new to-do:'), options: () => {
				return {
					'title': _('Focus title'),
					'body': _('Focus body'),
				};
			}},
			'newNoteFocus': { value: 'body', type: Setting.TYPE_STRING, isEnum: true, public: true, appTypes: ['desktop'], label: () => _('When creating a new note:'), options: () => {
				return {
					'title': _('Focus title'),
					'body': _('Focus body'),
				};
			}},
			'showTrayIcon': { value: true, type: Setting.TYPE_BOOL, public: true, appTypes: ['desktop'], label: () => _('Show tray icon') },
			'encryption.enabled': { value: false, type: Setting.TYPE_BOOL, public: false },
			'encryption.activeMasterKeyId': { value: '', type: Setting.TYPE_STRING, public: false },
			'encryption.passwordCache': { value: {}, type: Setting.TYPE_OBJECT, public: false },
			'style.zoom': {value: "100", type: Setting.TYPE_INT, public: true, appTypes: ['desktop'], label: () => _('Global zoom percentage'), minimum: "50", maximum: "500", step: "10"},
			'style.editor.fontFamily': {value: "", type: Setting.TYPE_STRING, public: true, appTypes: ['desktop'], label: () => _('Editor font family'), description: () => _('The font name will not be checked. If incorrect or empty, it will default to a generic monospace font.')},
			'autoUpdateEnabled': { value: true, type: Setting.TYPE_BOOL, public: true, appTypes: ['desktop'], label: () => _('Automatically update the application') },
			'sync.interval': { value: 300, type: Setting.TYPE_INT, isEnum: true, public: true, label: () => _('Synchronisation interval'), options: () => {
				return {
					0: _('Disabled'),
					300: _('%d minutes', 5),
					600: _('%d minutes', 10),
					1800: _('%d minutes', 30),
					3600: _('%d hour', 1),
					43200: _('%d hours', 12),
					86400: _('%d hours', 24),
				};
			}},
			'noteVisiblePanes': { value: ['editor', 'viewer'], type: Setting.TYPE_ARRAY, public: false, appTypes: ['desktop'] },
			'showAdvancedOptions': { value: false, type: Setting.TYPE_BOOL, public: true, appTypes: ['mobile' ], label: () => _('Show advanced options') },
			'sync.target': { value: SyncTargetRegistry.nameToId('onedrive'), type: Setting.TYPE_INT, isEnum: true, public: true, label: () => _('Synchronisation target'), description: (appType) => { return appType !== 'cli' ? null : _('The target to synchonise to. Each sync target may have additional parameters which are named as `sync.NUM.NAME` (all documented below).') }, options: () => {
				return SyncTargetRegistry.idAndLabelPlainObject();
			}},

			'sync.2.path': { value: '', type: Setting.TYPE_STRING, show: (settings) => {
				try {
					return settings['sync.target'] == SyncTargetRegistry.nameToId('filesystem')
				} catch (error) {
					return false;
				}
			}, public: true, label: () => _('Directory to synchronise with (absolute path)'), description: (appType) => { return appType !== 'cli' ? null : _('The path to synchronise with when file system synchronisation is enabled. See `sync.target`.'); } },

			'sync.5.path': { value: '', type: Setting.TYPE_STRING, show: (settings) => { return settings['sync.target'] == SyncTargetRegistry.nameToId('nextcloud') }, public: true, label: () => _('Nextcloud WebDAV URL') },
			'sync.5.username': { value: '', type: Setting.TYPE_STRING, show: (settings) => { return settings['sync.target'] == SyncTargetRegistry.nameToId('nextcloud') }, public: true, label: () => _('Nextcloud username') },
			'sync.5.password': { value: '', type: Setting.TYPE_STRING, show: (settings) => { return settings['sync.target'] == SyncTargetRegistry.nameToId('nextcloud') }, public: true, label: () => _('Nextcloud password'), secure: true },

			'sync.6.path': { value: '', type: Setting.TYPE_STRING, show: (settings) => { return settings['sync.target'] == SyncTargetRegistry.nameToId('webdav') }, public: true, label: () => _('WebDAV URL') },
			'sync.6.username': { value: '', type: Setting.TYPE_STRING, show: (settings) => { return settings['sync.target'] == SyncTargetRegistry.nameToId('webdav') }, public: true, label: () => _('WebDAV username') },
			'sync.6.password': { value: '', type: Setting.TYPE_STRING, show: (settings) => { return settings['sync.target'] == SyncTargetRegistry.nameToId('webdav') }, public: true, label: () => _('WebDAV password'), secure: true },

			'sync.3.auth': { value: '', type: Setting.TYPE_STRING, public: false },
			'sync.4.auth': { value: '', type: Setting.TYPE_STRING, public: false },
			'sync.1.context': { value: '', type: Setting.TYPE_STRING, public: false },
			'sync.2.context': { value: '', type: Setting.TYPE_STRING, public: false },
			'sync.3.context': { value: '', type: Setting.TYPE_STRING, public: false },
			'sync.4.context': { value: '', type: Setting.TYPE_STRING, public: false },
			'sync.5.context': { value: '', type: Setting.TYPE_STRING, public: false },
			'sync.6.context': { value: '', type: Setting.TYPE_STRING, public: false },
		};

		return this.metadata_;
	}

	static settingMetadata(key) {
		const metadata = this.metadata();
		if (!(key in metadata)) throw new Error('Unknown key: ' + key);
		let output = Object.assign({}, metadata[key]);
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

	static keys(publicOnly = false, appType = null) {
		if (!this.keys_) {
			const metadata = this.metadata();
			this.keys_ = [];
			for (let n in metadata) {
				if (!metadata.hasOwnProperty(n)) continue;
				this.keys_.push(n);
			}
		}

		if (appType || publicOnly) {
			let output = [];
			for (let i = 0; i < this.keys_.length; i++) {
				const md = this.settingMetadata(this.keys_[i]);
				if (publicOnly && !md.public) continue;
				if (appType && md.appTypes && md.appTypes.indexOf(appType) < 0) continue;
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

	static load() {
		this.cancelScheduleSave();
		this.cache_ = [];
		return this.modelSelectAll('SELECT * FROM settings').then((rows) => {
			this.cache_ = [];

			for (let i = 0; i < rows.length; i++) {
				let c = rows[i];

				if (!this.keyExists(c.key)) continue;
				c.value = this.formatValue(c.key, c.value);

				this.cache_.push(c);
			}

			this.dispatchUpdateAll();
		});
	}

	static toPlainObject() {
		const keys = this.keys();
		let keyToValues = {};
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
		if (!(key in this.constants_)) throw new Error('Unknown constant key: ' + key);
		this.constants_[key] = value;
	}

	static setValue(key, value) {
		if (!this.cache_) throw new Error('Settings have not been initialized!');

		value = this.formatValue(key, value);
		
		for (let i = 0; i < this.cache_.length; i++) {
			let c = this.cache_[i];
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

	static valueToString(key, value) {
		const md = this.settingMetadata(key);
		value = this.formatValue(key, value);
		if (md.type == Setting.TYPE_INT) return value.toFixed(0);
		if (md.type == Setting.TYPE_BOOL) return value ? '1' : '0';
		if (md.type == Setting.TYPE_ARRAY) return value ? JSON.stringify(value) : '[]';
		if (md.type == Setting.TYPE_OBJECT) return value ? JSON.stringify(value) : '{}';
		if (md.type == Setting.TYPE_STRING) return value ? value + '' : '';

		throw new Error('Unhandled value type: ' + md.type);	
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
			return value + '';
		}

		throw new Error('Unhandled value type: ' + md.type);
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
			if (output == 'SET_ME') throw new Error('Setting constant has not been set: ' + key);
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
		let output = [];
		for (let n in options) {
			if (!options.hasOwnProperty(n)) continue;
			output.push(n);
		}
		return output;
	}

	static enumOptionLabel(key, value) {
		const options = this.enumOptions(key);
		for (let n in options) {
			if (n == value) return options[n];
		}
		return '';
	}

	static enumOptions(key) {
		const metadata = this.metadata();
		if (!metadata[key]) throw new Error('Unknown key: ' + key);
		if (!metadata[key].options) throw new Error('No options for: ' + key);
		return metadata[key].options();
	}

	static enumOptionsDoc(key, templateString = null) {
		if (templateString === null) templateString = '%s: %s';
		const options = this.enumOptions(key);
		let output = [];
		for (let n in options) {
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
	static subValues(baseKey, settings) {
		let output = {};
		for (let key in settings) {
			if (!settings.hasOwnProperty(key)) continue;
			if (key.indexOf(baseKey) === 0) {
				const subKey = key.substr(baseKey.length + 1);
				output[subKey] = settings[key];
			}
		}
		return output;
	}

	// Currently only supports objects with properties one level deep
	// static object(key) {
	// 	let output = {};
	// 	let keys = this.keys();
	// 	for (let i = 0; i < keys.length; i++) {
	// 		let k = keys[i].split('.');
	// 		if (k[0] == key) {
	// 			output[k[1]] = this.value(keys[i]);
	// 		}
	// 	}
	// 	return output;
	// }

	// Currently only supports objects with properties one level deep
	// static setObject(key, object) {
	// 	for (let n in object) {
	// 		if (!object.hasOwnProperty(n)) continue;
	// 		this.setValue(key + '.' + n, object[n]);
	// 	}
	// }

	static async saveAll() {
		if (!this.saveTimeoutId_) return Promise.resolve();

		this.logger().info('Saving settings...');
		clearTimeout(this.saveTimeoutId_);
		this.saveTimeoutId_ = null;

		let queries = [];
		queries.push('DELETE FROM settings');
		for (let i = 0; i < this.cache_.length; i++) {
			let s = Object.assign({}, this.cache_[i]);
			s.value = this.valueToString(s.key, s.value);
			queries.push(Database.insertQuery(this.tableName(), s));
		}

		await BaseModel.db().transactionExecBatch(queries);
		
		this.logger().info('Settings have been saved.');
	}

	static scheduleSave() {
		if (!Setting.autoSaveEnabled) return;

		if (this.saveTimeoutId_) clearTimeout(this.saveTimeoutId_);

		this.saveTimeoutId_ = setTimeout(() => {
			this.saveAll();
		}, 500);
	}

	static cancelScheduleSave() {
		if (this.saveTimeoutId_) clearTimeout(this.saveTimeoutId_);
		this.saveTimeoutId_ = null;
	}

	static publicSettings(appType) {
		if (!appType) throw new Error('appType is required');

		const metadata = this.metadata();

		let output = {};
		for (let key in metadata) {
			if (!metadata.hasOwnProperty(key)) continue;
			let s = Object.assign({}, metadata[key]);
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

}

Setting.TYPE_INT = 1;
Setting.TYPE_STRING = 2;
Setting.TYPE_BOOL = 3;
Setting.TYPE_ARRAY = 4;
Setting.TYPE_OBJECT = 5;

Setting.THEME_LIGHT = 1;
Setting.THEME_DARK = 2;

Setting.DATE_FORMAT_1 = 'DD/MM/YYYY'
Setting.DATE_FORMAT_2 = 'DD/MM/YY';
Setting.DATE_FORMAT_3 = 'MM/DD/YYYY';
Setting.DATE_FORMAT_4 = 'MM/DD/YY';
Setting.DATE_FORMAT_5 = 'YYYY-MM-DD';

Setting.TIME_FORMAT_1 = 'HH:mm';
Setting.TIME_FORMAT_2 = 'h:mm A';

// Contains constants that are set by the application and
// cannot be modified by the user:
Setting.constants_ = {
	env: 'SET_ME',
	isDemo: false,
	appName: 'joplin',
	appId: 'SET_ME', // Each app should set this identifier
	appType: 'SET_ME', // 'cli' or 'mobile'
	resourceDir: '',
	profileDir: '',
	tempDir: '',
	openDevTools: false,
}

Setting.autoSaveEnabled = true;

module.exports = Setting;