import * as React from 'react';
import { useMemo, ReactElement } from 'react';
import { PluginHtmlContents, PluginStates, ViewInfo, utils as pluginUtils } from '@joplin/lib/services/plugins/reducer';
import PluginDialogWebView from './PluginDialogWebView';
import { Modal, Portal } from 'react-native-paper';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import WebviewController from '@joplin/lib/services/plugins/WebviewController';

interface Props {
	themeId: number;

	pluginHtmlContents: PluginHtmlContents;
	pluginStates: PluginStates;
}

const dismissDialog = (viewInfo: ViewInfo) => {
	if (!viewInfo.view.opened) return;

	const plugin = PluginService.instance().pluginById(viewInfo.plugin.id);
	const viewController = plugin.viewController(viewInfo.view.id) as WebviewController;
	viewController.closeWithResponse(null);
};

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
			<Portal
				key={`${viewInfo.plugin.id}-${viewInfo.view.id}`}
			>
				<Modal
					visible={true}
					onDismiss={() => dismissDialog(viewInfo)}
				>
					<PluginDialogWebView
						viewInfo={viewInfo}
						themeId={props.themeId}
						pluginStates={props.pluginStates}
						pluginHtmlContents={props.pluginHtmlContents}
					/>
				</Modal>
			</Portal>,
		);
	}

	return (
		<>
			{dialogs}
		</>
	);
};

export default PluginDialogManager;
