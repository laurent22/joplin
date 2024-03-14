import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import Logger from '@joplin/utils/Logger';
import RepositoryApi from '@joplin/lib/services/plugins/RepositoryApi';
import Setting from '@joplin/lib/models/Setting';
import { useMemo } from 'react';

const logger = Logger.create('useRepoApi');

interface Props {
	reloadRepoCounter: number;
	setRepoApiError: (error: string|null)=> void;
	onRepoApiLoaded: (repoApi: RepositoryApi)=> void;
}

let repoApi_: RepositoryApi|null = null;

const useRepoApi = ({ reloadRepoCounter, setRepoApiError, onRepoApiLoaded }: Props) => {
	const repoApi = useMemo(() => {
		repoApi_ ??= RepositoryApi.ofDefaultJoplinRepo(Setting.value('tempDir'));
		return repoApi_;
	}, []);

	useAsyncEffect(async event => {
		if (reloadRepoCounter > 0) {
			logger.info(`Reloading the plugin repository -- try #${reloadRepoCounter + 1}`);
		}

		setRepoApiError(null);
		try {
			await repoApi.initialize();
		} catch (error) {
			logger.error(error);
			setRepoApiError(error);
		}
		if (!event.cancelled) {
			onRepoApiLoaded(repoApi);
		}
	}, [setRepoApiError, reloadRepoCounter, repoApi]);

	return repoApi;
};

export default useRepoApi;
