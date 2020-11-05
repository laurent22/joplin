import ResourceEditWatcher from '../ResourceEditWatcher/index';
const ExternalEditWatcher = require('../ExternalEditWatcher');

export default {

	externalEditWatcher: () => ExternalEditWatcher.instance().externalApi(),
	resourceEditWatcher: () => ResourceEditWatcher.instance().externalApi(),

};
