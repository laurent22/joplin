import CommandService, {
	CommandContext,
	CommandDeclaration,
	CommandRuntime,
} from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import setLayoutItemProps from '../../ResizableLayout/utils/setLayoutItemProps';
import layoutItemProp from '../../ResizableLayout/utils/layoutItemProp';
import { AppState } from '../../../app.reducer';

// Record the current state of the sidebar and note list
const lastUserLayoutStatus = {
	isNoteListVisible: true,
	isSidebarVisible: true,
};

export const declaration: CommandDeclaration = {
	name: 'toggleEditorFullScreen',
	label: () => _('Toggle fullscreen'),
	iconName: 'fas fa-expand',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {
			const layout = (context.state as AppState).mainLayout;

			const isNoteListVisible = layoutItemProp(layout, 'noteList', 'visible');
			const isSidebarVisible = layoutItemProp(layout, 'sideBar', 'visible');
			let isEditorFullScreen = layoutItemProp(layout, 'editor', 'isFullScreen');

			if (isEditorFullScreen === undefined) {
				isEditorFullScreen = !isNoteListVisible && !isSidebarVisible;
			}

			let newLayout = layout;

			if (isEditorFullScreen) {
				newLayout = await CommandService.instance().execute('toggleSideBar', lastUserLayoutStatus.isSidebarVisible);
				newLayout = await CommandService.instance().execute('toggleNoteList', lastUserLayoutStatus.isNoteListVisible);
			} else {
				lastUserLayoutStatus.isSidebarVisible = isSidebarVisible;
				lastUserLayoutStatus.isNoteListVisible = isNoteListVisible;

				newLayout = await CommandService.instance().execute('toggleSideBar', false);
				newLayout = await CommandService.instance().execute('toggleNoteList', false);
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
