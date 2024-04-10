import Setting, { AppType, SettingMetadataSection, SettingSectionSource } from '../../../models/Setting';
import SyncTargetRegistry from '../../../SyncTargetRegistry';
const ObjectUtils = require('../../../ObjectUtils');
const { _ } = require('../../../locale');
import { createSelector } from 'reselect';
import Logger from '@joplin/utils/Logger';

import { type ReactNode } from 'react';
import { type Registry } from '../../../registry';
import settingValidations from '../../../models/settings/settingValidations';

const logger = Logger.create('config-shared');

interface ConfigScreenState {
	checkSyncConfigResult: { ok: boolean; errorMessage: string }|'checking'|null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	settings: any;
	changedSettingKeys: string[];
	showAdvancedSettings: boolean;
}

export const defaultScreenState: ConfigScreenState = {
	checkSyncConfigResult: null,
	settings: {},
	changedSettingKeys: [],
	showAdvancedSettings: false,
};

interface ConfigScreenComponent {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	settingToComponent(settingId: string, setting: any): ReactNode;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	sectionToComponent(sectionName: string, section: any, settings: any, isSelected: boolean): ReactNode;

	state: Partial<ConfigScreenState>;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	setState(callbackOrNew: any, callback?: ()=> void): void;
}

interface SettingsSavedEvent {
	savedSettingKeys: string[];
}

type OnSettingsSavedCallback = (event: SettingsSavedEvent)=> void;

let onSettingsSaved: OnSettingsSavedCallback = () => {};

export const init = (reg: Registry) => {
	onSettingsSaved = (event) => {
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

export const advancedSettingsButton_click = (comp: ConfigScreenComponent) => {
	comp.setState((state: ConfigScreenState) => {
		return { showAdvancedSettings: !state.showAdvancedSettings };
	});
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export const checkSyncConfig = async (comp: ConfigScreenComponent, settings: any) => {
	const syncTargetId = settings['sync.target'];
	const SyncTargetClass = SyncTargetRegistry.classById(syncTargetId);

	const options = {
		...Setting.subValues(`sync.${syncTargetId}`, settings),
		...Setting.subValues('net', settings) };

	comp.setState({ checkSyncConfigResult: 'checking' });
	const result = await SyncTargetClass.checkConfig(ObjectUtils.convertValuesToFunctions(options));
	comp.setState({ checkSyncConfigResult: result });

	if (result.ok) {
		// Users often expect config to be auto-saved at this point, if the config check was successful
		await saveSettings(comp);
	}
	return result;
};

export const checkSyncConfigMessages = (comp: ConfigScreenComponent) => {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export const updateSettingValue = (comp: ConfigScreenComponent, key: string, value: any, callback?: ()=> void) => {
	if (!callback) callback = () => {};

	comp.setState((state: ConfigScreenState) => {
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

		const settings = { ...state.settings };
		const changedSettingKeys = state.changedSettingKeys.slice();
		settings[key] = Setting.formatValue(key, value);
		if (changedSettingKeys.indexOf(key) < 0) changedSettingKeys.push(key);

		return {
			settings: settings,
			changedSettingKeys: changedSettingKeys,
		};
	}, callback);

	const metadata = Setting.settingMetadata(key);
	if (metadata.autoSave) {
		scheduleSaveSettings(comp);
	}
};

let scheduleSaveSettingsIID: ReturnType<typeof setTimeout>|null = null;
export const scheduleSaveSettings = (comp: ConfigScreenComponent) => {
	if (scheduleSaveSettingsIID) clearTimeout(scheduleSaveSettingsIID);

	scheduleSaveSettingsIID = setTimeout(async () => {
		scheduleSaveSettingsIID = null;
		await saveSettings(comp);
	}, 100);
};

export const saveSettings = async (comp: ConfigScreenComponent) => {
	const savedSettingKeys = comp.state.changedSettingKeys.slice();

	const validationMessage = await settingValidations(savedSettingKeys, comp.state.settings);
	if (validationMessage) {
		alert(validationMessage);
		return false;
	}

	for (const key in comp.state.settings) {
		if (!comp.state.settings.hasOwnProperty(key)) continue;
		if (comp.state.changedSettingKeys.indexOf(key) < 0) continue;
		Setting.setValue(key, comp.state.settings[key]);
	}

	comp.setState({ changedSettingKeys: [] });

	onSettingsSaved({ savedSettingKeys });

	return true;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export const settingsToComponents = (comp: ConfigScreenComponent, device: AppType, settings: any) => {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
type SettingsSelectorState = { device: AppType; settings: any };
const deviceSelector = (state: SettingsSelectorState) => state.device;
const settingsSelector = (state: SettingsSelectorState) => state.settings;

export const settingsSections = createSelector(
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

		if (device === AppType.Desktop || device === AppType.Cli) {
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
		} else {
			output.push(...([
				'tools', 'importOrExport', 'moreInfo',
			].map(name => {
				return {
					name,
					metadatas: [],
				};
			})));
		}

		// Ideally we would also check if the user was able to synchronize
		// but we don't have a way of doing that besides making a request to Joplin Cloud
		const syncTargetIsJoplinCloud = settings['sync.target'] === SyncTargetRegistry.nameToId('joplinCloud');
		if (syncTargetIsJoplinCloud) {
			output.push({
				name: 'joplinCloud',
				metadatas: [],
				isScreen: true,
			});
		}

		const order = Setting.sectionOrder();

		const sortOrderFor = (section: SettingMetadataSection) => {
			if (section.source === SettingSectionSource.Plugin) {
				// Plugins should go after all other sections
				return order.length + 1;
			}

			return order.indexOf(section.name);
		};

		output.sort((a, b) => {
			const o1 = sortOrderFor(a);
			const o2 = sortOrderFor(b);

			if (o1 === o2) {
				const l1 = Setting.sectionNameToLabel(a.name);
				const l2 = Setting.sectionNameToLabel(b.name);

				return l1.toLowerCase() < l2.toLowerCase() ? -1 : +1;
			}

			return o1 - o2;
		});

		return output;
	},
);

export const settingsToComponents2 = (
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	comp: ConfigScreenComponent, device: AppType, settings: any, selectedSectionName = '',
) => {
	const sectionComps: ReactNode[] = [];
	const sections = settingsSections({ device, settings });

	for (let i = 0; i < sections.length; i++) {
		const section = sections[i];
		const sectionComp = comp.sectionToComponent(section.name, section, settings, selectedSectionName === section.name);
		if (!sectionComp) continue;
		sectionComps.push(sectionComp);
	}

	return sectionComps;
};
