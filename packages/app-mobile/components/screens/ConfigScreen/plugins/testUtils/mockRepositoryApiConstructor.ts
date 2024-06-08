import RepositoryApi from '@joplin/lib/services/plugins/RepositoryApi';
import { createTempDir, supportDir } from '@joplin/lib/testing/test-utils';
import { remove } from 'fs-extra';

let repoTempDir: string|null = null;
const mockRepositoryApiConstructor = async () => {
	if (repoTempDir) {
		await remove(repoTempDir);
	}
	repoTempDir = await createTempDir();

	RepositoryApi.ofDefaultJoplinRepo = jest.fn((_tempDirPath: string, appType, installMode) => {
		return new RepositoryApi(`${supportDir}/pluginRepo`, repoTempDir, appType, installMode);
	});
};

export default mockRepositoryApiConstructor;
