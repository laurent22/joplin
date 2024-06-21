import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import Logger from '@joplin/utils/Logger';
import RepositoryApi, { InstallMode } from '@joplin/lib/services/plugins/RepositoryApi';
import Setting, { AppType } from '@joplin/lib/models/Setting';
import { useMemo } from 'react';
import shim from '@joplin/lib/shim';
import PluginService from '@joplin/lib/services/plugins/PluginService';

const logger = Logger.create('useRepoApi');

interface Props {
	reloadRepoCounter: number;
	setRepoApiError: (error: string|null)=> void;
	onRepoApiLoaded: (repoApi: RepositoryApi)=> void;
}

let repoApi_: RepositoryApi|null = null;

export const resetRepoApi = () => {
	repoApi_ = null;
};

const useRepoApi = ({ reloadRepoCounter, setRepoApiError, onRepoApiLoaded }: Props) => {
	const repoApi = useMemo(() => {
		const installMode = shim.mobilePlatform() === 'ios' ? InstallMode.Restricted : InstallMode.Default;
		const appInfo = { type: AppType.Mobile, version: PluginService.instance().appVersion };
		repoApi_ ??= RepositoryApi.ofDefaultJoplinRepo(Setting.value('tempDir'), appInfo, installMode);
		return repoApi_;
	}, []);

	useAsyncEffect(async event => {
		if (reloadRepoCounter > 0) {
			logger.info(`Reloading the plugin repository -- try #${reloadRepoCounter + 1}`);
		}

		setRepoApiError(null);
		try {
			await repoApi.reinitialize();
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
