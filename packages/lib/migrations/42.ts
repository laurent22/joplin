import Setting from '../models/Setting';
import checkProviderIsSupported from '../utils/webDAVUtils';

interface Script {
	exec: ()=> Promise<void>;
}

const script: Script = <Script>{};

script.exec = async () => {
	try {
		checkProviderIsSupported(Setting.value('sync.6.path'));
		Setting.setValue('sync.allowUnsupportedProviders', 0);
	} catch (error) {
		Setting.setValue('sync.allowUnsupportedProviders', 1);
	}
};

export default script;


