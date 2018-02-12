const Setting = require('lib/models/Setting.js');
const SyncTargetRegistry = require('lib/SyncTargetRegistry');
const { _ } = require('lib/locale.js');

const shared = {}

shared.init = function(comp) {
	if (!comp.state) comp.state = {};
	comp.state.checkSyncConfigResult = null;
}

shared.checkSyncConfig = async function(comp, settings) {
	const syncTargetId = settings['sync.target'];
	const SyncTargetClass = SyncTargetRegistry.classById(syncTargetId);
	const options = Setting.subValues('sync.' + syncTargetId, settings);
	comp.setState({ checkSyncConfigResult: 'checking' });
	const result = await SyncTargetClass.checkConfig(options);
	comp.setState({ checkSyncConfigResult: result });
}

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
}

module.exports = shared;