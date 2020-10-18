import { CommandRuntime, CommandDeclaration } from 'lib/services/CommandService';
import { _ } from 'lib/locale';
import { DesktopCommandContext } from 'ElectronClient/services/commands/types';

export const declaration:CommandDeclaration = {
	name: 'focusElementSideBar',
	label: () => _('Sidebar'),
	parentLabel: () => _('Focus'),
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async (context:DesktopCommandContext) => {
			const sideBarVisible = !!context.state.sidebarVisibility;

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
