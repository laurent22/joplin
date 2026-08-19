import { CommandContext, CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import setLayoutItemProps from '../../ResizableLayout/utils/setLayoutItemProps';
import layoutItemProp from '../../ResizableLayout/utils/layoutItemProp';
import { AppState } from '../../../app.reducer';
import { WindowControl } from '../utils/useWindowControl';

export const declaration: CommandDeclaration = {
	name: 'toggleSideBar',
	label: () => _('Toggle sidebar'),
	iconName: 'fas fa-bars',
};

export const runtime = (control: WindowControl): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {
			const layout = (context.state as AppState).mainLayout;

			const visible = !layoutItemProp(layout, 'sideBar', 'visible');
			const newLayout = setLayoutItemProps(layout, 'sideBar', {
				visible,
			});
			control.announcePanelVisibility(_('Sidebar'), visible);

			// Toggling the sidebar will affect the size of most other on-screen components.
			// Dispatching a window resize event is a bit of a hack, but it ensures that any
			// component that watches for resizes will be accurately notified
			window.dispatchEvent(new Event('resize'));

			context.dispatch({
				type: 'MAIN_LAYOUT_SET',
				value: newLayout,
			});
		},
	};
};
