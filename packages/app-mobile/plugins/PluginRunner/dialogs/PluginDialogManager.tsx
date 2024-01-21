import * as React from 'react';
import { useMemo, ReactElement } from 'react';
import { PluginHtmlContents, PluginStates, utils as pluginUtils } from '@joplin/lib/services/plugins/reducer';
import PluginDialogWebView from './PluginDialogWebView';

interface Props {
	themeId: number;

	pluginHtmlContents: PluginHtmlContents;
	pluginStates: PluginStates;
}

const PluginDialogManager: React.FC<Props> = props => {
	const viewInfos = useMemo(() => {
		return pluginUtils.viewInfosByType(props.pluginStates, 'webview');
	}, [props.pluginStates]);

	const dialogs: ReactElement[] = [];
	for (const viewInfo of viewInfos) {
		if (!viewInfo.view.opened) {
			continue;
		}

		dialogs.push(
			<PluginDialogWebView
				key={`${viewInfo.plugin.id}-${viewInfo.view.id}`}
				viewInfo={viewInfo}
				themeId={props.themeId}
				pluginStates={props.pluginStates}
				pluginHtmlContents={props.pluginHtmlContents}
			/>,
		);
	}

	return (
		<>
			{dialogs}
		</>
	);
};

export default PluginDialogManager;
