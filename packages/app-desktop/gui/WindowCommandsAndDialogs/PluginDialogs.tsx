import * as React from 'react';
import UserWebviewDialog from '../../services/plugins/UserWebviewDialog';
import { PluginHtmlContents, PluginStates, utils as pluginUtils } from '@joplin/lib/services/plugins/reducer';
import { ContainerType } from '@joplin/lib/services/plugins/WebviewController';
import { VisibleDialogs } from '../../app.reducer';

interface Props {
	themeId: number;
	visibleDialogs: VisibleDialogs;
	pluginHtmlContents: PluginHtmlContents;
	plugins: PluginStates;
}

const PluginDialogs: React.FC<Props> = props => {
	const output = [];
	const infos = pluginUtils.viewInfosByType(props.plugins, 'webview');

	for (const info of infos) {
		const { plugin, view } = info;
		if (view.containerType !== ContainerType.Dialog) continue;
		if (!props.visibleDialogs[view.id]) continue;
		const html = props.pluginHtmlContents[plugin.id]?.[view.id] ?? '';

		output.push(<UserWebviewDialog
			key={view.id}
			viewId={view.id}
			themeId={props.themeId}
			html={html}
			scripts={view.scripts}
			pluginId={plugin.id}
			buttons={view.buttons}
			fitToContent={view.fitToContent}
		/>);
	}

	if (!output.length) return null;

	return (
		<div className='user-webview-dialog-container'>
			{output}
		</div>
	);
};

export default PluginDialogs;
