import { CommandContext, CommandDeclaration, CommandRuntime } from '../services/CommandService';
import getActivePluginEditorView from '../services/plugins/utils/getActivePluginEditorView';
import Logger from '@joplin/utils/Logger';
import getActivePluginEditorViews from '../services/plugins/utils/getActivePluginEditorViews';
import PluginService from '../services/plugins/PluginService';
import WebviewController from '../services/plugins/WebviewController';
import Setting from '../models/Setting';

const logger = Logger.create('showEditorPlugin');

export const declaration: CommandDeclaration = {
	name: 'showEditorPlugin',
	label: () => 'Show editor plugin',
	iconName: 'fas fa-eye',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, editorViewId = '', show = true) => {
			logger.info('View:', editorViewId, 'Show:', show);

			const pluginStates = context.state.pluginService.plugins;
			const windowId = context.state.windowId;
			if (!editorViewId) {
				const { editorPlugin, editorView } = getActivePluginEditorView(pluginStates, windowId);

				if (!editorPlugin) {
					logger.warn('No editor plugin to toggle to');
					return;
				}

				editorViewId = editorView.id;
			}

			const activePlugins = getActivePluginEditorViews(pluginStates, windowId);
			const editorPluginData = activePlugins.find(({ editorView }) => editorView.id === editorViewId);
			if (!editorPluginData) {
				logger.warn(`No editor view with ID ${editorViewId} is active.`);
				return;
			}
			const { editorView } = editorPluginData;
			const controller = PluginService.instance().viewControllerByViewId(editorView.id) as WebviewController;
			if (!controller) {
				throw new Error(`No controller registered for editor view ${editorView.id}`);
			}

			const previousVisible = editorView.parentWindowId === windowId && controller.visible;

			if (show && previousVisible) {
				logger.info(`Editor is already visible: ${editorViewId}`);
				return;
			} else if (!show && !previousVisible) {
				logger.info(`Editor is already hidden: ${editorViewId}`);
				return;
			}

			const getUpdatedShownViewIds = () => {
				let newShownViewTypeIds = [...Setting.value('plugins.shownEditorViewIds')];
				// Always filter out the current view, even if show is false. This prevents
				// the view ID from being present multiple times.
				const viewIdsWithoutCurrent = newShownViewTypeIds.filter(id => id !== editorView.editorTypeId);
				newShownViewTypeIds = viewIdsWithoutCurrent;

				if (show) {
					newShownViewTypeIds.push(editorView.editorTypeId);
				}
				return newShownViewTypeIds;
			};
			Setting.setValue('plugins.shownEditorViewIds', getUpdatedShownViewIds());

			await controller.setOpen(show);
		},
	};
};
