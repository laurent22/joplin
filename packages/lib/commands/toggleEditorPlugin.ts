import CommandService, { CommandContext, CommandDeclaration, CommandRuntime } from '../services/CommandService';
import { _ } from '../locale';
import Logger from '@joplin/utils/Logger';
import getActivePluginEditorViews from '../services/plugins/utils/getActivePluginEditorViews';
import getShownPluginEditorView from '../services/plugins/utils/getShownPluginEditorView';

const logger = Logger.create('toggleEditorPlugin');

export const declaration: CommandDeclaration = {
	name: 'toggleEditorPlugin',
	label: () => _('Toggle editor plugin'),
	iconName: 'fas fa-eye',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {
			const activeWindowId = context.state.windowId;
			const activePluginStates = getActivePluginEditorViews(context.state.pluginService.plugins, activeWindowId);

			if (activePluginStates.length === 0) {
				logger.warn('No editor plugin to toggle to');
				return;
			}

			let showedView = false;
			const setEditorPluginVisible = async (viewId: string, visible: boolean) => {
				await CommandService.instance().execute('showEditorPlugin', viewId, visible);
				showedView ||= visible;
			};

			const { editorView: visibleView } = getShownPluginEditorView(context.state.pluginService.plugins, activeWindowId);
			// Hide the visible view
			if (visibleView) {
				await setEditorPluginVisible(visibleView.id, false);
			}

			// Show the next view
			const visibleViewIndex = activePluginStates.findIndex(state => state.editorView.id === visibleView?.id);
			const nextIndex = visibleViewIndex + 1;
			if (nextIndex < activePluginStates.length) {
				await setEditorPluginVisible(activePluginStates[nextIndex].editorView.id, true);
			}

			if (!showedView) {
				// When the plugin editor goes from visible to hidden, we need to reload the note
				// because it may have been changed via the data API.
				context.dispatch({
					type: 'EDITOR_NOTE_NEEDS_RELOAD',
				});
			}
		},

		enabledCondition: 'hasActivePluginEditor',
	};
};
