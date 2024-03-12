import RepositoryApi from '@joplin/lib/services/plugins/RepositoryApi';
import { createTempDir, supportDir } from '@joplin/lib/testing/test-utils';


const newRepoApi = async (): Promise<RepositoryApi> => {
	const repo = new RepositoryApi(`${supportDir}/pluginRepo`, await createTempDir());
	await repo.initialize();
	return repo;
};

export default newRepoApi;
