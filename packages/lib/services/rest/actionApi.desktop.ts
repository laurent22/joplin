import ResourceEditWatcher from '../ResourceEditWatcher/index';
import ExternalEditWatcher from '../ExternalEditWatcher';

export default {

	externalEditWatcher: () => ExternalEditWatcher.instance().externalApi(),
	resourceEditWatcher: () => ResourceEditWatcher.instance().externalApi(),

};
