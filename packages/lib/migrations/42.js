const Setting = require('../models/Setting').default;
const checkProviderIsUnsupported = require('../utils/webDAVUtils').default;

const script = {};

script.exec = async function() {
	const providerCheck = checkProviderIsUnsupported(Setting.value('sync.6.path'));
	if (providerCheck.unsupportedProvider) {
		Setting.setValue('sync.allowUnsupportedProviders', 1);
	} else {
		Setting.setValue('sync.allowUnsupportedProviders', 0);
	}
};

module.exports = script;


