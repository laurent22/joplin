import Logger from '@joplin/utils/Logger';
import { PluginStates } from '../reducer';
import getActivePluginEditorViews from './getActivePluginEditorViews';

const logger = Logger.create('getActivePluginEditorView');

export default (plugins: PluginStates, windowId: string) => {
	const allActiveViews = getActivePluginEditorViews(plugins, windowId);

	if (allActiveViews.length === 0) {
		return { editorPlugin: null, editorView: null };
	}

	const result = allActiveViews[0];
	if (allActiveViews.length > 1) {
		const ignoredPluginIds = allActiveViews.slice(1).map(({ editorPlugin }) => editorPlugin.id);
		logger.warn(`More than one editor plugin are active for this note. Active plugin: ${result.editorPlugin.id}. Ignored plugins: ${ignoredPluginIds.join(',')}`);
	}

	return allActiveViews[0];
};

