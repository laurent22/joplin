import Setting from '../../models/Setting';
import shim from '../../shim';
import PluginService from './PluginService';
import RepositoryApi from './RepositoryApi';
import { blockedVersionsFromManifests, mergeBlockedVersions } from './utils/blockedVersions';

const hasUserInstalledPlugins = async () => {
	const pluginDir = Setting.value('pluginDir');
	if (!(await shim.fsDriver().exists(pluginDir))) return false;
	return (await shim.fsDriver().readDirStats(pluginDir)).length > 0;
};

// Returns the IDs of the running plugins that are now blocked
const refreshBlockedPluginVersions = async (repoApi: RepositoryApi) => {
	if (!(await hasUserInstalledPlugins())) return [];

	await repoApi.initializeManifestsOnly();
	const current = Setting.value('plugins.blockedVersions') ?? {};
	let fetched = blockedVersionsFromManifests(await repoApi.manifests());
	if (!repoApi.isUsingDefaultContentUrl) fetched = mergeBlockedVersions(current, fetched);
	// Avoids a needless settings change, which on mobile reloads all plugins
	if (JSON.stringify(fetched) !== JSON.stringify(current)) Setting.setValue('plugins.blockedVersions', fetched);

	const service = PluginService.instance();
	return service.pluginIds.filter(id => {
		const plugin = service.pluginById(id);
		return plugin.running && service.isBlocked(plugin.manifest);
	});
};

export default refreshBlockedPluginVersions;
