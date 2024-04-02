import RepositoryApi, { InstallMode } from '@joplin/lib/services/plugins/RepositoryApi';
import { createTempDir, supportDir } from '@joplin/lib/testing/test-utils';


const newRepoApi = async (installMode: InstallMode): Promise<RepositoryApi> => {
	const repo = new RepositoryApi(`${supportDir}/pluginRepo`, await createTempDir(), installMode);
	await repo.initialize();
	return repo;
};

export default newRepoApi;
