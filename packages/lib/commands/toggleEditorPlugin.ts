import { CommandContext, CommandDeclaration, CommandRuntime } from '../services/CommandService';
import { _ } from '../locale';
import Setting from '../models/Setting';
import getActivePluginEditorView from '../services/plugins/utils/getActivePluginEditorView';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('toggleEditorPlugin');

export const declaration: CommandDeclaration = {
	name: 'toggleEditorPlugin',
	label: () => _('Toggle editor plugin'),
	iconName: 'fas fa-eye',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {
			const shownEditorViewIds = Setting.value('plugins.shownEditorViewIds');
			const { editorPlugin, editorView } = getActivePluginEditorView(context.state.pluginService.plugins);

			if (!editorPlugin) {
				logger.warn('No editor plugin to toggle to');
				return;
			}

			const idx = shownEditorViewIds.indexOf(editorView.id);
			let hasBeenHidden = false;

			if (idx < 0) {
				shownEditorViewIds.push(editorView.id);
			} else {
				shownEditorViewIds.splice(idx, 1);
				hasBeenHidden = true;
			}

			logger.info('New shown editor views: ', shownEditorViewIds);

			Setting.setValue('plugins.shownEditorViewIds', shownEditorViewIds);

			if (hasBeenHidden) {
				// When the plugin editor goes from visible to hidden, we need to reload the note
				// because it may have been changed via the data API.
				context.dispatch({
					type: 'EDITOR_NOTE_NEEDS_RELOAD',
				});
			}
		},
	};
};
