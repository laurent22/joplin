import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';

const isInstallingPluginsAllowed = () => {
	return shim.mobilePlatform() !== 'ios' || Setting.value('env') === 'dev';
};

export default isInstallingPluginsAllowed;
