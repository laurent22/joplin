import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { AppState } from '../../../app.reducer';
import setLayoutItemProps from '../../ResizableLayout/utils/setLayoutItemProps';
import layoutItemProp from '../../ResizableLayout/utils/layoutItemProp';

export const declaration: CommandDeclaration = {
	name: 'focusSearch',
	label: () => _('Search in all the notes'),
};

export const runtime = (searchBarRef: any): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {
			const layout = (context.state as AppState).mainLayout;

			if (!layoutItemProp(layout, 'noteList', 'visible')) {
				const newLayout = setLayoutItemProps(layout, 'noteList', {
					visible: true,
				});

				// Toggling the sidebar will affect the size of most other on-screen components.
				// Dispatching a window resize event is a bit of a hack, but it ensures that any
				// component that watches for resizes will be accurately notified
				window.dispatchEvent(new Event('resize'));

				context.dispatch({
					type: 'MAIN_LAYOUT_SET',
					value: newLayout,
				});
			}

			if (searchBarRef.current) searchBarRef.current.select();
		},
	};
};
