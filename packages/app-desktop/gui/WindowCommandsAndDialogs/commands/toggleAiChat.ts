import { CommandContext, CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import layoutItemProp from '../../ResizableLayout/utils/layoutItemProp';
import { AppState } from '../../../app.reducer';
import { WindowControl } from '../utils/useWindowControl';
import { defaultWindowId } from '@joplin/lib/reducer';

export const declaration: CommandDeclaration = {
	name: 'toggleAiChat',
	label: () => _('Toggle AI Chat'),
	iconName: 'fas fa-comment-dots',
};

export const runtime = (control: WindowControl): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {
			const state = context.state as AppState;
			const layout = state.windowId === defaultWindowId ? state.mainLayout : state.secondaryWindowLayout;
			if (!layout) return;

			const visible = !layoutItemProp(layout, 'chatPanel', 'visible');
			control.announcePanelVisibility(_('AI Chat'), visible);

			window.dispatchEvent(new Event('resize'));

			context.dispatch({
				type: 'WINDOW_LAYOUT_SET_ITEM_PROP',
				windowId: context.state.windowId,
				itemKey: 'chatPanel',
				propName: 'visible',
				propValue: visible,
			});
		},
	};
};
