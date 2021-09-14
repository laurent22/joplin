const ExternalEditWatcher = require('lib/services/ExternalEditWatcher');

export default {

	externalEditWatcher: () => ExternalEditWatcher.instance().externalApi(),

};
