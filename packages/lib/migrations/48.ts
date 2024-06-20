import Setting from '../models/Setting';
import KeychainService from '../services/keychain/KeychainService';

interface Script {
	exec: ()=> Promise<void>;
}

const script: Script = {
	exec: async () => {
		// Keychain support was added for Electron+Linux through Electron safeStorage.
		// The support check needs to be re-run.
		if (Setting.value('keychain.supported') === 0) {
			Setting.setValue('keychain.supported', -1);
		}
		await KeychainService.instance().runMigration(48);
	},
};

export default script;


