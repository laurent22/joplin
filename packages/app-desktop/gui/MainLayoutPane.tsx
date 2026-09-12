import * as React from 'react';
import { useContext, useRef } from 'react';
import NoteListWrapper from './NoteListWrapper/NoteListWrapper';
import { RenderItemEvent } from './ResizableLayout/ResizableLayout';
import Sidebar from './Sidebar/Sidebar';
import { WindowIdContext } from './NewWindowOrIFrame';
import { NoteListColumns } from '@joplin/lib/services/plugins/api/noteListType';
import NoteEditor from './NoteEditor/NoteEditor';
import ChatPanel from './ChatPanel/ChatPanel';
import { PluginHtmlContents, PluginStates, utils as pluginUtils } from '@joplin/lib/services/plugins/reducer';
import { _ } from '@joplin/lib/locale';
import UserWebview from '../services/plugins/UserWebview';
import removeItem from './ResizableLayout/utils/removeItem';
import { LayoutItem } from './ResizableLayout/utils/types';
import { AppState } from '../app.reducer';
import { connect } from 'react-redux';
import { stateUtils } from '@joplin/lib/reducer';
import validateColumns from './NoteListHeader/utils/validateColumns';

interface Props {
	themeId: number;
	listRendererId: string;
	startupPluginsLoaded: boolean;
	notesSortOrderField: string;
	notesColumns: NoteListColumns;
	selectedFolderId: string;
	notesSortOrderReverse: boolean;
	plugins: PluginStates;
	pluginHtmlContents: PluginHtmlContents;

	contentKey: string;
	event: RenderItemEvent;
	layout: LayoutItem;
	onNoteTitleChange?: (title: string)=> void;
	onUpdateLayout: (layout: LayoutItem)=> void;
}

const MainLayoutPane: React.FC<Props> = (props) => {
	const { contentKey, event } = props;


	const windowId = useContext(WindowIdContext);
	const cancelLayoutRemoveRef = useRef(0);

	// Key should never be undefined but somehow it can happen, also not
	// clear how. For now in this case render nothing so that the app
	// doesn't crash.
	// https://discourse.joplinapp.org/t/rearranging-the-pannels-crushed-the-app-and-generated-fatal-error/14373?u=laurent
	if (!contentKey) {
		console.error('resizableLayout_renderItem: Trying to render an item using an empty key. Full layout is:', props.layout);
		return null;
	}

	const eventEmitter = event.eventEmitter;

	// const viewsToRemove:string[] = [];

	const components: Record<string, ()=> React.ReactNode> = {
		sideBar: () => {
			return <Sidebar />;
		},

		noteList: () => {
			return <NoteListWrapper
				resizableLayoutEventEmitter={eventEmitter}
				visible={event.visible}
				size={event.size}
				themeId={props.themeId}
				listRendererId={props.listRendererId}
				startupPluginsLoaded={props.startupPluginsLoaded}
				notesSortOrderField={props.notesSortOrderField}
				notesSortOrderReverse={props.notesSortOrderReverse}
				columns={props.notesColumns}
				selectedFolderId={props.selectedFolderId}
			/>;
		},

		editor: () => {
			return <div className='note-editor-wrapper' role='main' aria-label={_('Note')}>
				<NoteEditor
					windowId={windowId}
					onTitleChange={props.onNoteTitleChange}
					startupPluginsLoaded={props.startupPluginsLoaded}
				/>
			</div>;
		},

		chatPanel: () => {
			return <ChatPanel windowId={windowId} />;
		},
	};

	if (components[contentKey]) return components[contentKey]();

	const viewsToRemove: string[] = [];

	if (contentKey.indexOf('plugin-view') === 0) {
		const viewInfo = pluginUtils.viewInfoByViewId(props.plugins, event.item.key);

		if (!viewInfo) {
			// Once all startup plugins have loaded, we know that all the
			// views are ready so we can remove the orphans ones.
			//
			// Before they are loaded, there might be views that don't match
			// any plugins, but that's only because it hasn't loaded yet.
			if (props.startupPluginsLoaded) {
				console.warn(`Could not find plugin associated with view: ${event.item.key}`);
				viewsToRemove.push(event.item.key);
			}
		} else {
			const { view, plugin } = viewInfo;
			const html = props.pluginHtmlContents[plugin.id]?.[view.id] ?? '';

			return <UserWebview
				key={view.id}
				viewId={view.id}
				themeId={props.themeId}
				html={html}
				scripts={view.scripts}
				pluginId={plugin.id}
				borderBottom={true}
				fitToContent={false}
			/>;
		}
	} else {
		// The layout may reference a component that no longer exists -
		// for example a panel from a previous version of the app, or a
		// feature that has been removed. Rather than crash, log the issue
		// and queue the item for removal from the layout.
		console.warn(`Invalid layout component: ${contentKey} - it will be removed from the layout`);
		viewsToRemove.push(contentKey);
	}

	if (viewsToRemove.length) {
		const cancelCounter = cancelLayoutRemoveRef.current + 1;
		cancelLayoutRemoveRef.current = cancelCounter;
		window.requestAnimationFrame(() => {
			if (cancelCounter !== cancelLayoutRemoveRef.current) return;

			let newLayout = props.layout;
			for (const itemKey of viewsToRemove) {
				newLayout = removeItem(newLayout, itemKey);
			}

			if (newLayout !== props.layout) {
				console.warn('Removed invalid views:', viewsToRemove);
				props.onUpdateLayout(newLayout);
			}
		});
	}

	return null;
};

interface OwnProps {
	windowId: string;
}

export default connect((state: AppState, ownProps: OwnProps) => {
	const windowState = stateUtils.windowStateById(state, ownProps.windowId);

	return {
		themeId: state.settings.theme,
		plugins: state.pluginService.plugins,
		pluginHtmlContents: state.pluginService.pluginHtmlContents,
		startupPluginsLoaded: state.startupPluginsLoaded,
		listRendererId: state.settings['notes.listRendererId'],
		selectedFolderId: windowState.selectedFolderId,
		notesSortOrderField: state.settings['notes.sortOrder.field'],
		notesSortOrderReverse: state.settings['notes.sortOrder.reverse'],
		notesColumns: validateColumns(state.settings['notes.columns']),
	};
})(MainLayoutPane);
