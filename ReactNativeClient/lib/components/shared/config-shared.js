const Setting = require('lib/models/Setting.js');
const SyncTargetRegistry = require('lib/SyncTargetRegistry');
const ObjectUtils = require('lib/ObjectUtils');
const { _ } = require('lib/locale.js');
const { createSelector } = require('reselect');
const { reg } = require('lib/registry');

const shared = {};

shared.init = function(comp) {
	if (!comp.state) comp.state = {};
	comp.state.checkSyncConfigResult = null;
	comp.state.checkNextcloudAppResult = null;
	comp.state.settings = {};
	comp.state.changedSettingKeys = [];
	comp.state.showNextcloudAppLog = false;
	comp.state.showAdvancedSettings = false;
};

shared.advancedSettingsButton_click = (comp) => {
	comp.setState(state => {
		return { showAdvancedSettings: !state.showAdvancedSettings };
	});
};

shared.checkSyncConfig = async function(comp, settings) {
	const syncTargetId = settings['sync.target'];
	const SyncTargetClass = SyncTargetRegistry.classById(syncTargetId);
	const options = Setting.subValues(`sync.${syncTargetId}`, settings);
	comp.setState({ checkSyncConfigResult: 'checking' });
	const result = await SyncTargetClass.checkConfig(ObjectUtils.convertValuesToFunctions(options));
	comp.setState({ checkSyncConfigResult: result });

	if (result.ok) {
		await shared.checkNextcloudApp(comp, settings);
		// Users often expect config to be auto-saved at this point, if the config check was successful
		shared.saveSettings(comp);
	}
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

shared.checkNextcloudApp = async function(comp, settings) {
	if (settings['sync.target'] !== 5) return;

	comp.setState({ checkNextcloudAppResult: 'checking' });
	let result = null;
	const appApi = await reg.syncTargetNextcloud().appApi(settings);

	try {
		result = await appApi.setupSyncTarget(settings['sync.5.path']);
	} catch (error) {
		reg.logger().error('Could not setup sync target:', error);
		result = { error: error.message };
	}

	const newSyncTargets = Object.assign({}, settings['sync.5.syncTargets']);
	newSyncTargets[settings['sync.5.path']] = result;
	shared.updateSettingValue(comp, 'sync.5.syncTargets', newSyncTargets);

	// Also immediately save the result as this is most likely what the user would expect
	Setting.setValue('sync.5.syncTargets', newSyncTargets);

	comp.setState({ checkNextcloudAppResult: 'done' });
};

shared.updateSettingValue = function(comp, key, value) {
	comp.setState(state => {
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

shared.saveSettings = function(comp) {
	for (const key in comp.state.settings) {
		if (!comp.state.settings.hasOwnProperty(key)) continue;
		if (comp.state.changedSettingKeys.indexOf(key) < 0) continue;
		console.info('Saving', key, comp.state.settings[key]);
		Setting.setValue(key, comp.state.settings[key]);
	}

	comp.setState({ changedSettingKeys: [] });
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
