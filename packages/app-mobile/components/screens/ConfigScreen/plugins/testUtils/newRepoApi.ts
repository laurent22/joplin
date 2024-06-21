import { AppType } from '@joplin/lib/models/Setting';
import RepositoryApi, { InstallMode } from '@joplin/lib/services/plugins/RepositoryApi';
import { createTempDir, supportDir } from '@joplin/lib/testing/test-utils';


const newRepoApi = async (installMode: InstallMode, appVersion = '3.0.0'): Promise<RepositoryApi> => {
	const appInfo = { type: AppType.Mobile, version: appVersion };
	const repo = new RepositoryApi(`${supportDir}/pluginRepo`, await createTempDir(), appInfo, installMode);
	await repo.reinitialize();
	return repo;
};

export default newRepoApi;
