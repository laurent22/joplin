import Setting, { AppType } from '@joplin/lib/models/Setting';
import RepositoryApi, { InstallMode } from '@joplin/lib/services/plugins/RepositoryApi';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import refreshBlockedPluginVersions from '@joplin/lib/services/plugins/refreshBlockedPluginVersions';
import { State, stateUtils } from '@joplin/lib/reducer';
import shim from '@joplin/lib/shim';
import time from '@joplin/lib/time';
import { _ } from '@joplin/lib/locale';
import Logger from '@joplin/utils/Logger';
import { Store } from 'redux';
import bridge from '../bridge';
import restart from '../restart';

const logger = Logger.create('startBlockedPluginsCheck');

const waitForNotesSaved = async (store: Store<State>) => {
	const startTime = Date.now();
	while (stateUtils.hasNotesBeingSaved(store.getState()) && Date.now() - startTime < 5000) {
		await time.msleep(100);
	}
};

// A blocked plugin can't be fully unloaded on desktop since its content scripts run in the main
// window, so we restart straight away rather than wait for the user, who may not be at their computer.
const restartForBlockedPlugins = async (store: Store<State>, pluginIds: string[]) => {
	logger.warn('Restarting because these running plugins have been blocked:', pluginIds);
	const service = PluginService.instance();
	Setting.setValue('plugins.blockedRestartNotice', pluginIds.map(id => service.pluginById(id).manifest.name));
	await waitForNotesSaved(store);
	await restart();
};

const showBlockedRestartNotice = () => {
	const pluginNames: string[] = Setting.value('plugins.blockedRestartNotice');
	if (!pluginNames.length) return;
	Setting.setValue('plugins.blockedRestartNotice', []);
	bridge().showInfoMessageBox(_('Joplin was restarted because the following plugins have been disabled by the Joplin team for security reasons: %s\n\nWe recommend uninstalling them.', pluginNames.join(', ')));
};

const startBlockedPluginsCheck = (store: Store<State>) => {
	showBlockedRestartNotice();

	const repoApi = RepositoryApi.ofDefaultJoplinRepo(
		Setting.value('tempDir'), { type: AppType.Desktop, version: PluginService.instance().appVersion }, InstallMode.Default,
	);

	const check = async () => {
		try {
			const blockedRunningPluginIds = await refreshBlockedPluginVersions(repoApi);
			if (blockedRunningPluginIds.length) await restartForBlockedPlugins(store, blockedRunningPluginIds);
		} catch (error) {
			logger.warn('Could not refresh blocked plugin versions:', error);
		}
	};

	void check();
	shim.setInterval(() => { void check(); }, 60 * 60 * 1000);
};

export default startBlockedPluginsCheck;
