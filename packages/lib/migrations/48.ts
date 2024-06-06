import Setting from '../models/Setting';
import shim from '../shim';

interface Script {
	exec: ()=> Promise<void>;
}

const script: Script = {
	exec: async () => {
		// Keychain support was added for Electron+Linux through Electron safeStorage.
		// The support check needs to be re-run.
		if (shim.isLinux() && shim.isElectron()) {
			Setting.setValue('keychain.supported', -1);
		}
	},
};

export default script;


