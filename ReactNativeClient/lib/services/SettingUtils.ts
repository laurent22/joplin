/* eslint-disable import/prefer-default-export */

import KeychainService from './keychain/KeychainService';
const Setting = require('lib/models/Setting');
const { uuid } = require('lib/uuid.js');

// This function takes care of initialising both the keychain service and settings.
//
// Loading the settings became more complicated with the keychain integration. This is because
// the settings needs a keychain service, and the keychain service needs a clientId, which
// is set dynamically and saved to the settings.
// In other words, it's not possible to load the settings without the KS service and it's not
// possible to initialise the KS service without the settings.
// The solution is to fetch just the client ID directly from the database.
export async function loadKeychainServiceAndSettings(KeychainServiceDriver:any) {
	const clientIdSetting = await Setting.loadOne('clientId');
	const clientId = clientIdSetting ? clientIdSetting.value : uuid.create();
	KeychainService.instance().initialize(new KeychainServiceDriver(Setting.value('appId'), clientId));
	Setting.setKeychainService(KeychainService.instance());
	await Setting.load();
	if (!clientIdSetting) Setting.setValue('clientId', clientId);
	await KeychainService.instance().detectIfKeychainSupported();
}
