import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import layoutItemProp from '../../ResizableLayout/utils/layoutItemProp';
import { AppState } from '../../../app';

export const declaration: CommandDeclaration = {
	name: 'focusElementSideBar',
	label: () => _('Sidebar'),
	parentLabel: () => _('Focus'),
};

export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {
			const sideBarVisible = layoutItemProp((context.state as AppState).mainLayout, 'sideBar', 'visible');

			if (sideBarVisible) {
				const item = comp.selectedItem();
				if (item) {
					const anchorRef = comp.anchorItemRefs[item.type][item.id];
					if (anchorRef) anchorRef.current.focus();
				} else {
					const anchorRef = comp.firstAnchorItemRef('folder');
					if (anchorRef) anchorRef.current.focus();
				}
			}
		},

		enabledCondition: 'sideBarVisible',
	};
};
