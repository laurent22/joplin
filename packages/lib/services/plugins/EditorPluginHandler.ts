// The goal of this class is to simplify the integration of the `joplin.views.editor` plugin logic
// in the desktop and mobile app. See here for more information:
//
// packages/lib/services/plugins/api/JoplinViewsEditor.ts

import Logger from '@joplin/utils/Logger';
import AsyncActionQueue, { IntervalType } from '../../AsyncActionQueue';
import eventManager from '../../eventManager';
import { EditorActivationCheckFilterObject } from './api/types';
import type PluginService from './PluginService';
import WebviewController from './WebviewController';

const logger = Logger.create('EditorPluginHandler');

const makeNoteUpdateAction = (pluginService: PluginService, shownEditorViewIds: string[]) => {
	return async () => {
		for (const viewId of shownEditorViewIds) {
			const controller = pluginService.viewControllerByViewId(viewId) as WebviewController;
			if (controller) controller.emitUpdate();
		}
	};
};

export default class {

	private pluginService_: PluginService;
	private viewUpdateAsyncQueue_ = new AsyncActionQueue(100, IntervalType.Fixed);

	public constructor(pluginService: PluginService) {
		this.pluginService_ = pluginService;
	}

	public emitUpdate(shownEditorViewIds: string[]) {
		logger.info('emitUpdate:', shownEditorViewIds);
		this.viewUpdateAsyncQueue_.push(makeNoteUpdateAction(this.pluginService_, shownEditorViewIds));
	}

	public async emitActivationCheck() {
		let filterObject: EditorActivationCheckFilterObject = {
			activatedEditors: [],
		};
		filterObject = await eventManager.filterEmit('editorActivationCheck', filterObject);

		logger.info('emitActivationCheck: responses:', filterObject);

		for (const editor of filterObject.activatedEditors) {
			const controller = this.pluginService_.pluginById(editor.pluginId).viewController(editor.viewId) as WebviewController;
			controller.setActive(editor.isActive);
		}
	}

}
