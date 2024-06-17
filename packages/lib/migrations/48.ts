import Setting from '../models/Setting';
import KeychainService from '../services/keychain/KeychainService';
import shim from '../shim';

interface Script {
	exec: ()=> Promise<void>;
}

const script: Script = {
	exec: async () => {
		// Keychain support was added for Electron+Linux through Electron safeStorage.
		// The support check needs to be re-run. This will be done on the **next** start
		// start.
		if (shim.isLinux() && shim.isElectron()) {
			Setting.setValue('keychain.supported', -1);
			await KeychainService.instance().runMigration(48);
		}
	},
};

export default script;


