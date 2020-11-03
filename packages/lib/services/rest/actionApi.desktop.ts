import ResourceEditWatcher from 'lib/services/ResourceEditWatcher/index';
const ExternalEditWatcher = require('lib/services/ExternalEditWatcher');

export default {

	externalEditWatcher: () => ExternalEditWatcher.instance().externalApi(),
	resourceEditWatcher: () => ResourceEditWatcher.instance().externalApi(),

};
