import CommandService, { ToolbarButtonInfo } from 'lib/services/CommandService';
import { PluginStates, utils as pluginUtils } from 'lib/services/plugins/reducer';
import { useMemo } from 'react';

export default function(toolbarButtonInfos:ToolbarButtonInfo[], plugins:PluginStates) {
	return useMemo(() => {
		const output = toolbarButtonInfos.slice();

		const infos = pluginUtils.viewInfosByType(plugins, 'toolbarButton');

		for (const info of infos) {
			const view = info.view;
			if (view.location !== 'editorToolbar') continue;
			output.push(CommandService.instance().commandToToolbarButton(view.commandName));
		}

		return output;
	}, [toolbarButtonInfos, plugins]);
}
