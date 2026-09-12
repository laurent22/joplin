import { _ } from '@joplin/lib/locale';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import { PluginStates, utils as pluginUtils } from '@joplin/lib/services/plugins/reducer';

const layoutKeyToLabel = (key: string, plugins: PluginStates) => {
	if (key === 'sideBar') return _('Sidebar');
	if (key === 'noteList') return _('Note list');
	if (key === 'editor') return _('Editor');
	if (key === 'chatPanel') return _('AI Chat');

	const viewInfo = pluginUtils.viewInfoByViewId(plugins, key);
	if (viewInfo) {
		return PluginService.instance().safePluginNameById(viewInfo.plugin.id);
	}
	return key;
};

export default layoutKeyToLabel;
