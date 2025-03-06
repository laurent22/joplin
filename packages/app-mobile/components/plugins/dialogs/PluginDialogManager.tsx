import * as React from 'react';
import { ReactElement } from 'react';
import { PluginHtmlContents, PluginStates, ViewInfo } from '@joplin/lib/services/plugins/reducer';
import PluginDialogWebView from './PluginDialogWebView';
import { Modal, Portal } from 'react-native-paper';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import WebviewController, { ContainerType } from '@joplin/lib/services/plugins/WebviewController';
import useViewInfos from './hooks/useViewInfos';
import PluginPanelViewer from './PluginPanelViewer';

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
	const viewInfos = useViewInfos(props.pluginStates);

	const dialogs: ReactElement[] = [];
	for (const viewInfo of viewInfos) {
		if (viewInfo.view.containerType !== ContainerType.Dialog || !viewInfo.view.opened) {
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
			<PluginPanelViewer/>
		</>
	);
};

export default PluginDialogManager;
