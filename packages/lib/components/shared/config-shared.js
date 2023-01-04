const Setting = require('../../models/Setting').default;
const SyncTargetRegistry = require('../../SyncTargetRegistry').default;
const ObjectUtils = require('../../ObjectUtils');
const { _ } = require('../../locale');
const { createSelector } = require('reselect');
const Logger = require('../../Logger').default;

const logger = Logger.create('config-shared');

const shared = {};

shared.onSettingsSaved = () => {};

shared.init = function(comp, reg) {
	if (!comp.state) comp.state = {};
	comp.state.checkSyncConfigResult = null;
	comp.state.settings = {};
	comp.state.changedSettingKeys = [];
	comp.state.showAdvancedSettings = false;

	shared.onSettingsSaved = (event) => {
		const savedSettingKeys = event.savedSettingKeys;

		// After changing the sync settings we immediately trigger a sync
		// operation. This will ensure that the client gets the sync info as
		// early as possible, in particular the encryption state (encryption
		// keys, whether it's enabled, etc.). This should prevent situations
		// where the user tried to setup E2EE on the client even though it's
		// already been done on another client.
		if (savedSettingKeys.find(s => s.startsWith('sync.'))) {
			logger.info('Sync settings have been changed - scheduling a sync');
			void reg.scheduleSync();
		}
	};
};

shared.advancedSettingsButton_click = (comp) => {
	comp.setState(state => {
		return { showAdvancedSettings: !state.showAdvancedSettings };
	});
};

shared.checkSyncConfig = async function(comp, settings) {
	const syncTargetId = settings['sync.target'];
	const SyncTargetClass = SyncTargetRegistry.classById(syncTargetId);

	const options = Object.assign({},
		Setting.subValues(`sync.${syncTargetId}`, settings),
		Setting.subValues('net', settings));

	comp.setState({ checkSyncConfigResult: 'checking' });
	const result = await SyncTargetClass.checkConfig(ObjectUtils.convertValuesToFunctions(options));
	comp.setState({ checkSyncConfigResult: result });

	if (result.ok) {
		// Users often expect config to be auto-saved at this point, if the config check was successful
		shared.saveSettings(comp);
	}
	return result;
};

shared.checkSyncConfigMessages = function(comp) {
	const result = comp.state.checkSyncConfigResult;
	const output = [];

	if (result === 'checking') {
		output.push(_('Checking... Please wait.'));
	} else if (result && result.ok) {
		output.push(_('Success! Synchronisation configuration appears to be correct.'));
	} else if (result && !result.ok) {
		output.push(_('Error. Please check that URL, username, password, etc. are correct and that the sync target is accessible. The reported error was:'));
		output.push(result.errorMessage);
	}

	return output;
};

shared.updateSettingValue = function(comp, key, value) {
	comp.setState(state => {
		// @react-native-community/slider (4.4.0) will emit a valueChanged event
		// when the component is mounted, even though the value hasn't changed.
		// We should ignore this, otherwise it will mark the settings as
		// unsaved.
		//
		// Upstream: https://github.com/callstack/react-native-slider/issues/395
		//
		// https://github.com/laurent22/joplin/issues/7503
		if (state.settings[key] === value) {
			logger.info('Trying to update a setting that has not changed - skipping it.', key, value);
			return {};
		}

		const settings = Object.assign({}, state.settings);
		const changedSettingKeys = state.changedSettingKeys.slice();
		settings[key] = Setting.formatValue(key, value);
		if (changedSettingKeys.indexOf(key) < 0) changedSettingKeys.push(key);

		return {
			settings: settings,
			changedSettingKeys: changedSettingKeys,
		};
	});
};

shared.scheduleSaveSettings = function(comp) {
	if (shared.scheduleSaveSettingsIID) clearTimeout(shared.scheduleSaveSettingsIID);

	shared.scheduleSaveSettingsIID = setTimeout(() => {
		shared.scheduleSaveSettingsIID = null;
		shared.saveSettings(comp);
	}, 100);
};

shared.saveSettings = function(comp) {
	const savedSettingKeys = comp.state.changedSettingKeys.slice();

	for (const key in comp.state.settings) {
		if (!comp.state.settings.hasOwnProperty(key)) continue;
		if (comp.state.changedSettingKeys.indexOf(key) < 0) continue;
		Setting.setValue(key, comp.state.settings[key]);
	}

	comp.setState({ changedSettingKeys: [] });

	shared.onSettingsSaved({ savedSettingKeys });
};

shared.settingsToComponents = function(comp, device, settings) {
	const keys = Setting.keys(true, device);
	const settingComps = [];

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		if (!Setting.isPublic(key)) continue;

		const md = Setting.settingMetadata(key);
		if (md.show && !md.show(settings)) continue;

		const settingComp = comp.settingToComponent(key, settings[key]);
		if (!settingComp) continue;
		settingComps.push(settingComp);
	}

	return settingComps;
};

const deviceSelector = (state) => state.device;
const settingsSelector = (state) => state.settings;

shared.settingsSections = createSelector(
	deviceSelector,
	settingsSelector,
	(device, settings) => {
		const keys = Setting.keys(true, device);
		const metadatas = [];

		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			if (!Setting.isPublic(key)) continue;

			const md = Setting.settingMetadata(key);
			if (md.show && !md.show(settings)) continue;

			metadatas.push(md);
		}

		const output = Setting.groupMetadatasBySections(metadatas);

		output.push({
			name: 'encryption',
			metadatas: [],
			isScreen: true,
		});

		output.push({
			name: 'server',
			metadatas: [],
			isScreen: true,
		});

		output.push({
			name: 'keymap',
			metadatas: [],
			isScreen: true,
		});

		return output;
	}
);

shared.settingsToComponents2 = function(comp, device, settings, selectedSectionName = '') {
	const sectionComps = [];
	const sections = shared.settingsSections({ device, settings });

	for (let i = 0; i < sections.length; i++) {
		const section = sections[i];
		const sectionComp = comp.sectionToComponent(section.name, section, settings, selectedSectionName === section.name);
		if (!sectionComp) continue;
		sectionComps.push(sectionComp);
	}

	return sectionComps;
};

module.exports = shared;
