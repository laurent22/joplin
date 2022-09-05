import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import layoutItemProp from '../../ResizableLayout/utils/layoutItemProp';
import { AppState } from '../../../app.reducer';

export const declaration: CommandDeclaration = {
	name: 'focusElementSideBar',
	label: () => _('Sidebar'),
	parentLabel: () => _('Focus'),
};

export interface RuntimeProps {
	getSelectedItem(): any;
	getFirstAnchorItemRef(type: string): any;
	anchorItemRefs: any;
}

export const runtime = (props: RuntimeProps): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {
			const sidebarVisible = layoutItemProp((context.state as AppState).mainLayout, 'sideBar', 'visible');

			if (sidebarVisible) {
				const item = props.getSelectedItem();
				if (item) {
					const anchorRef = props.anchorItemRefs.current[item.type][item.id];
					if (anchorRef) anchorRef.current.focus();
				} else {
					const anchorRef = props.getFirstAnchorItemRef('folder');
					if (anchorRef) anchorRef.current.focus();
				}
			}
		},

		enabledCondition: 'sideBarVisible',
	};
};
