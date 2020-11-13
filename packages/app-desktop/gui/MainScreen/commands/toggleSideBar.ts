import { CommandContext, CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import setLayoutItemProps from '../../ResizableLayout/utils/setLayoutItemProps';
import layoutItemProp from '../../ResizableLayout/utils/layoutItemProp';
import { AppState } from '../../../app';

export const declaration: CommandDeclaration = {
	name: 'toggleSideBar',
	label: () => _('Toggle sidebar'),
	iconName: 'fas fa-bars',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {
			const layout = (context.state as AppState).mainLayout;

			const newLayout = setLayoutItemProps(layout, 'sideBar', {
				visible: !layoutItemProp(layout, 'sideBar', 'visible'),
			});

			context.dispatch({
				type: 'MAIN_LAYOUT_SET',
				value: newLayout,
			});
		},
	};
};
