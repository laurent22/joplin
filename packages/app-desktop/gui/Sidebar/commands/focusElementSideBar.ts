import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import layoutItemProp from '../../ResizableLayout/utils/layoutItemProp';
import { AppState } from '../../../app.reducer';
import { SidebarCommandRuntimeProps } from '../types';

export const declaration: CommandDeclaration = {
	name: 'focusElementSideBar',
	label: () => _('Sidebar'),
	parentLabel: () => _('Focus'),
};

export const runtime = (props: SidebarCommandRuntimeProps): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {
			const sidebarVisible = layoutItemProp((context.state as AppState).mainLayout, 'sideBar', 'visible');

			if (sidebarVisible) {
				props.focusSidebar();
			}
		},

		enabledCondition: 'sideBarVisible',
	};
};
