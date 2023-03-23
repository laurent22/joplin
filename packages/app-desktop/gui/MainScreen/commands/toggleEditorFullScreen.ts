import {
	CommandContext,
	CommandDeclaration,
	CommandRuntime,
} from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import setLayoutItemProps from '../../ResizableLayout/utils/setLayoutItemProps';
import layoutItemProp from '../../ResizableLayout/utils/layoutItemProp';
import { AppState } from '../../../app.reducer';

export const declaration: CommandDeclaration = {
	name: 'toggleEditorFullScreen',
	label: () => _('toggle full screen'),
	iconName: 'fas fa-expand',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {
			const layout = (context.state as AppState).mainLayout;

			let isEditorFullScreen = layoutItemProp(layout, 'editor', 'isFullScreen');

			if (isEditorFullScreen === undefined) {
				const isNoteListVisible = layoutItemProp(layout, 'noteList', 'visible');
				const isSidebarVisible = layoutItemProp(layout, 'sideBar', 'visible');

				isEditorFullScreen = !isNoteListVisible && !isSidebarVisible;
			}

			let newLayout = layout;

			if (isEditorFullScreen) {
				newLayout = setLayoutItemProps(newLayout, 'sideBar', {
					visible: true,
				});

				newLayout = setLayoutItemProps(newLayout, 'noteList', {
					visible: true,
				});
			} else {
				newLayout = setLayoutItemProps(newLayout, 'sideBar', {
					visible: false,
				});
				newLayout = setLayoutItemProps(newLayout, 'noteList', {
					visible: false,
				});
			}

			newLayout = setLayoutItemProps(newLayout, 'editor', {
				isFullScreen: !isEditorFullScreen,
			});

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
