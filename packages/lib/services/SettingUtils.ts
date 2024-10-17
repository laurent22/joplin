/* eslint-disable import/prefer-default-export */

import KeychainService from './keychain/KeychainService';
import Setting from '../models/Setting';
import uuid from '../uuid';
import { migrateLocalSyncInfo } from './synchronizer/syncInfoUtils';
import KeychainServiceDriverBase from './keychain/KeychainServiceDriverBase';
import shim from '../shim';

type KeychainServiceDriverConstructor = new (appId: string, clientId: string)=> KeychainServiceDriverBase;

// This function takes care of initialising both the keychain service and settings.
//
// Loading the settings became more complicated with the keychain integration. This is because
// the settings needs a keychain service, and the keychain service needs a clientId, which
// is set dynamically and saved to the settings.
// In other words, it's not possible to load the settings without the KS service and it's not
// possible to initialise the KS service without the settings.
// The solution is to fetch just the client ID directly from the database.
export async function loadKeychainServiceAndSettings(keychainServiceDrivers: KeychainServiceDriverConstructor[]) {
	const clientIdSetting = await Setting.loadOne('clientId');
	const clientId = clientIdSetting ? clientIdSetting.value : uuid.create();

	// Temporary workaround: For a short time, pre-release versions of Joplin Portable encrypted
	// saved keys using the keychain. This can break sync when transferring Joplin between devices.
	// To prevent secure keys from being lost, we enable read-only keychain access in portable mode.
	if (shim.isPortable()) {
		KeychainService.instance().readOnly = true;
	}

	await KeychainService.instance().initialize(
		keychainServiceDrivers.map(Driver => new Driver(Setting.value('appId'), clientId)),
	);
	Setting.setKeychainService(KeychainService.instance());
	await Setting.load();

	// Using Linux with the keychain has been observed to cause all secure settings to be lost
	// on Fedora 40 + GNOME. (This may have been related to running multiple Joplin instances).
	// For now, make saving to the keychain opt-in until more feedback is received.
	if (shim.isLinux() && !Setting.value('featureFlag.linuxKeychain')) {
		KeychainService.instance().readOnly = true;
	}

	// This is part of the migration to the new sync target info. It needs to be
	// set as early as possible since it's used to tell if E2EE is enabled, it
	// contains the master keys, etc. Once it has been set, it becomes a noop
	// on future calls.
	await migrateLocalSyncInfo(Setting.db());

	if (!clientIdSetting) Setting.setValue('clientId', clientId);
	await KeychainService.instance().detectIfKeychainSupported();
}
