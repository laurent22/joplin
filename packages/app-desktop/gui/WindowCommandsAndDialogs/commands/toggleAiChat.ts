import { CommandContext, CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import layoutItemProp from '../../ResizableLayout/utils/layoutItemProp';
import { AppState } from '../../../app.reducer';
import { WindowControl } from '../utils/useWindowControl';

export const declaration: CommandDeclaration = {
	name: 'toggleAiChat',
	label: () => _('Toggle AI Chat'),
	iconName: 'fas fa-comment-dots',
};

export const runtime = (control: WindowControl): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {
			const layout = (context.state as AppState).mainLayout;
			if (!layout) return;

			const visible = !layoutItemProp(layout, 'chatPanel', 'visible');
			control.announcePanelVisibility(_('AI Chat'), visible);

			window.dispatchEvent(new Event('resize'));

			context.dispatch({
				type: 'MAIN_LAYOUT_SET_ITEM_PROP',
				itemKey: 'chatPanel',
				propName: 'visible',
				propValue: visible,
			});
		},
	};
};
