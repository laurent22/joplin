const Setting = require('../models/Setting').default;
const checkProviderIsSupported = require('../utils/webDAVUtils').default;

const script = {};

script.exec = async function() {
	try {
		checkProviderIsSupported(Setting.value('sync.6.path'));
		Setting.setValue('sync.allowUnsupportedProviders', 0);
	} catch (error) {
		Setting.setValue('sync.allowUnsupportedProviders', 1);
	}
};

module.exports = script;


