const Setting = require('lib/models/Setting.js');
const SyncTargetRegistry = require('lib/SyncTargetRegistry');
const ObjectUtils = require('lib/ObjectUtils');
const { _ } = require('lib/locale.js');

const shared = {};

shared.init = function(comp) {
	if (!comp.state) comp.state = {};
	comp.state.checkSyncConfigResult = null;
	comp.state.settings = {};
	comp.state.changedSettingKeys = [];
};

shared.checkSyncConfig = async function(comp, settings) {
	const syncTargetId = settings['sync.target'];
	const SyncTargetClass = SyncTargetRegistry.classById(syncTargetId);
	const options = Setting.subValues('sync.' + syncTargetId, settings);
	comp.setState({ checkSyncConfigResult: 'checking' });
	const result = await SyncTargetClass.checkConfig(ObjectUtils.convertValuesToFunctions(options));
	comp.setState({ checkSyncConfigResult: result });
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
	const settings = Object.assign({}, comp.state.settings);
	const changedSettingKeys = comp.state.changedSettingKeys.slice();
	settings[key] = Setting.formatValue(key, value);
	if (changedSettingKeys.indexOf(key) < 0) changedSettingKeys.push(key);

	comp.setState({
		settings: settings,
		changedSettingKeys: changedSettingKeys,
	});
};

shared.saveSettings = function(comp) {
	for (let key in comp.state.settings) {
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

shared.settingsToComponents2 = function(comp, device, settings) {
	const keys = Setting.keys(true, device);
	const sectionComps = [];
	const metadatas = [];

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		if (!Setting.isPublic(key)) continue;

		const md = Setting.settingMetadata(key);
		if (md.show && !md.show(settings)) continue;

		metadatas.push(md);
	}

	const sections = Setting.groupMetadatasBySections(metadatas);

	for (let i = 0; i < sections.length; i++) {
		const section = sections[i];
		const sectionComp = comp.sectionToComponent(section.name, section, settings);
		if (!sectionComp) continue;
		sectionComps.push(sectionComp);
	}

	return sectionComps;
};

module.exports = shared;
