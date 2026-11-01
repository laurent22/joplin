import * as React from 'react';
import { Dispatch } from 'redux';
import ResizableLayout, { RenderItemEvent } from './ResizableLayout/ResizableLayout';
import findItemByKey from './ResizableLayout/utils/findItemByKey';
import { MoveButtonClickEvent } from './ResizableLayout/MoveButtons';
import { move } from './ResizableLayout/utils/movements';
import { LayoutItem } from './ResizableLayout/utils/types';
import CommandService from '@joplin/lib/services/CommandService';
import { PluginHtmlContents, PluginStates, utils as pluginUtils } from '@joplin/lib/services/plugins/reducer';
import UserWebviewDialog from '../services/plugins/UserWebviewDialog';
import { ContainerType } from '@joplin/lib/services/plugins/WebviewController';
import { defaultWindowId, StateLastDeletion, stateUtils } from '@joplin/lib/reducer';
import { _ } from '@joplin/lib/locale';
import { AppState } from '../app.reducer';
import { saveLayout, loadLayout } from './ResizableLayout/utils/persist';
import Setting from '@joplin/lib/models/Setting';
import { produce } from 'immer';
import shim from '@joplin/lib/shim';
import bridge from '../services/bridge';
import styled from 'styled-components';
import { themeStyle } from '@joplin/lib/theme';
import validateLayout from './ResizableLayout/utils/validateLayout';
import iterateItems from './ResizableLayout/utils/iterateItems';
import removeItem from './ResizableLayout/utils/removeItem';
import removeKeylessItems from './ResizableLayout/utils/removeKeylessItems';
import { isCallbackUrl } from '@joplin/lib/callbackUrlUtils';
import executeCallbackUrl from './MainScreen/handleCallbackUrl';
import ElectronAppWrapper from '../ElectronAppWrapper';
import { connect } from 'react-redux';
import TrashNotification from './TrashNotification/TrashNotification';
import UpdateNotification from './UpdateNotification/UpdateNotification';
import PluginNotification from './PluginNotification/PluginNotification';
import { Toast } from '@joplin/lib/services/plugins/api/types';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('MainScreen');

import { ipcRenderer } from 'electron';
import layoutKeyToLabel from '../utils/layout/layoutKeyToLabel';
import MainLayoutPane from './MainLayoutPane';
import WarningBanner from './WarningBanner';

interface Props {
	plugins: PluginStates;
	pluginHtmlContents: PluginHtmlContents;
	hasNotesBeingSaved: boolean;
	dispatch: Dispatch;
	mainLayout: LayoutItem;
	style: React.CSSProperties & { width?: number; height?: number };
	layoutMoveMode: boolean;
	shouldUpgradeSyncTarget: boolean;
	themeId: number;
	enableLegacyMarkdownEditor: boolean;
	processingShareInvitationResponse: boolean;
	isResettingLayout: boolean;
	lastDeletion: StateLastDeletion;
	lastDeletionNotificationTime: number;
	toast: Toast;
}

interface ShareFolderDialogOptions {
	folderId: string;
	visible: boolean;
}

interface State {
	promptOptions: Record<string, unknown> | null;
	notePropertiesDialogOptions: Record<string, unknown>;
	noteContentPropertiesDialogOptions: Record<string, unknown>;
	shareNoteDialogOptions: Record<string, unknown>;
	shareFolderDialogOptions: ShareFolderDialogOptions;
	messageBoxVisible: boolean;
}

const StyledUserWebviewDialogContainer = styled.div`
	display: flex;
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	z-index: 1000;
	box-sizing: border-box;
`;

const defaultLayout: LayoutItem = {
	key: 'root',
	children: [
		{ key: 'sideBar', width: 250 },
		{ key: 'noteList', width: 250 },
		{ key: 'editor', flexible: true },
		{ key: 'chatPanel', width: 340, visible: false },
	],
};

class MainScreenComponent extends React.Component<Props, State> {

	private waitForNotesSavedIID_: ReturnType<typeof setInterval>;
	private styleKey_: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- styles_ holds heterogeneous values (CSSProperties for nested style blocks, plus computed numbers like rowHeight)
	private styles_: any;

	public constructor(props: Props) {
		super(props);

		this.state = {
			promptOptions: null,
			notePropertiesDialogOptions: {},
			noteContentPropertiesDialogOptions: {},
			shareNoteDialogOptions: {},
			shareFolderDialogOptions: {
				visible: false,
				folderId: '',
			},
			messageBoxVisible: false,
		};

		this.updateMainLayout(this.buildLayout(props.plugins));

		this.setupAppCloseHandling();

		this.resizableLayout_resize = this.resizableLayout_resize.bind(this);
		this.resizableLayout_renderItem = this.resizableLayout_renderItem.bind(this);
		this.resizableLayout_moveButtonClick = this.resizableLayout_moveButtonClick.bind(this);
		this.window_resize = this.window_resize.bind(this);
		this.rowHeight = this.rowHeight.bind(this);
		this.layoutModeListenerKeyDown = this.layoutModeListenerKeyDown.bind(this);

		window.addEventListener('resize', this.window_resize);

		ipcRenderer.on('asynchronous-message', (_event: import('electron').IpcRendererEvent, message: string, args: { url: string }) => {
			if (message === 'openCallbackUrl') {
				void this.openCallbackUrl(args.url);
			}
		});

		const initialCallbackUrl = (bridge().electronApp() as ElectronAppWrapper).initialCallbackUrl();
		if (initialCallbackUrl) {
			void this.openCallbackUrl(initialCallbackUrl);
		}
	}

	private async openCallbackUrl(url: string) {
		try {
			if (!isCallbackUrl(url)) throw new Error(`Invalid callback URL: ${url}`);
			await executeCallbackUrl(url);
		} catch (error) {
			logger.error('Error handling callback URL:', error);
		}
	}

	private updateLayoutPluginViews(layout: LayoutItem, plugins: PluginStates) {
		const infos = pluginUtils.viewInfosByType(plugins, 'webview');

		let newLayout = produce(layout, (draftLayout: LayoutItem) => {
			for (const info of infos) {
				if (info.view.containerType !== ContainerType.Panel) continue;

				const viewId = info.view.id;
				const existingItem = findItemByKey(draftLayout, viewId);

				if (!existingItem) {
					draftLayout.children.push({
						key: viewId,
						visible: info.view.opened,
						context: {
							pluginId: info.plugin.id,
						},
					});
				}
			}
		});

		// Remove layout items that belong to plugins that are no longer
		// active.
		const pluginIds = Object.keys(plugins);
		const itemsToRemove: string[] = [];
		iterateItems(newLayout, (_itemIndex: number, item: LayoutItem, _parent: LayoutItem) => {
			if (item.context && item.context.pluginId && !pluginIds.includes(item.context.pluginId as string)) {
				itemsToRemove.push(item.key);
			}
			return true;
		});

		for (const itemKey of itemsToRemove) {
			newLayout = removeItem(newLayout, itemKey);
		}

		return newLayout !== layout ? validateLayout(newLayout) : layout;
	}

	private buildLayout(plugins: PluginStates): LayoutItem {
		const rootLayoutSize = this.rootLayoutSize();

		let userLayout = Setting.value('ui.layout');
		let output = null;

		try {
			// Migration: stamp the flexible flag on the editor and clear any
			// stale width before validateLayout's first pass.
			if (userLayout && Object.keys(userLayout).length) {
				userLayout = produce(userLayout as LayoutItem, (draft: LayoutItem) => {
					const editor = findItemByKey(draft, 'editor');
					if (editor && !editor.flexible) {
						editor.flexible = true;
						delete editor.width;
					}
				});
			}

			output = loadLayout(Object.keys(userLayout).length ? userLayout : null, defaultLayout, rootLayoutSize);

			// For unclear reasons, layout items sometimes end up without a key.
			// In that case, we can't do anything with them, so remove them
			// here. It could be due to the deprecated plugin API, which allowed
			// creating panel without a key, although in this case it should
			// have been set automatically.
			// https://github.com/laurent22/joplin/issues/4926
			output = removeKeylessItems(output);

			if (!findItemByKey(output, 'sideBar') || !findItemByKey(output, 'noteList') || !findItemByKey(output, 'editor')) {
				throw new Error('"sideBar", "noteList" and "editor" must be present in the layout');
			}

			// Migration: existing users have layouts saved before chatPanel
			// existed. Add it (hidden) so the toggle works.
			if (!findItemByKey(output, 'chatPanel')) {
				output = produce(output, (draft: LayoutItem) => {
					draft.children.push({ key: 'chatPanel', width: 340, visible: false });
				});
			}
		} catch (error) {
			console.warn('Could not load layout - restoring default layout:', error);
			console.warn('Layout was:', userLayout);
			output = loadLayout(null, defaultLayout, rootLayoutSize);
		}

		return this.updateLayoutPluginViews(output, plugins);
	}

	private window_resize() {
		this.updateRootLayoutSize();
	}

	public setupAppCloseHandling() {
		this.waitForNotesSavedIID_ = null;

		// This event is dispatched from the main process when the app is about
		// to close. The renderer process must respond with the "appCloseReply"
		// and tell the main process whether the app can really be closed or not.
		// For example, it cannot be closed right away if a note is being saved.
		// If a note is being saved, we wait till it is saved and then call
		// "appCloseReply" again.
		ipcRenderer.on('appClose', async () => {
			logger.info('[appClose] Received appClose event - hasNotesBeingSaved:', this.props.hasNotesBeingSaved);
			if (this.waitForNotesSavedIID_) shim.clearInterval(this.waitForNotesSavedIID_);
			this.waitForNotesSavedIID_ = null;

			const sendCanClose = async (canClose: boolean) => {
				logger.info('[appClose] Sending appCloseReply - canClose:', canClose);
				if (canClose) {
					Setting.setValue('wasClosedSuccessfully', true);
					await Setting.saveAll();
				}
				ipcRenderer.send('asynchronous-message', 'appCloseReply', { canClose });
			};

			await sendCanClose(!this.props.hasNotesBeingSaved);

			if (this.props.hasNotesBeingSaved) {
				logger.info('[appClose] Notes are being saved, waiting...');
				this.waitForNotesSavedIID_ = shim.setInterval(() => {
					if (!this.props.hasNotesBeingSaved) {
						logger.info('[appClose] Notes saved, now sending canClose: true');
						shim.clearInterval(this.waitForNotesSavedIID_);
						this.waitForNotesSavedIID_ = null;
						void sendCanClose(true);
					}
				}, 50);
			}
		});
	}

	public updateMainLayout(layout: LayoutItem) {
		this.props.dispatch({
			type: 'MAIN_LAYOUT_SET',
			value: layout,
		});
	}

	public updateRootLayoutSize() {
		this.updateMainLayout(produce(this.props.mainLayout, (draft: LayoutItem) => {
			const s = this.rootLayoutSize();
			draft.width = s.width;
			draft.height = s.height;
		}));
	}

	public componentDidUpdate(prevProps: Props, prevState: State) {
		if (prevProps.style.width !== this.props.style.width ||
			prevProps.style.height !== this.props.style.height ||
			prevState.messageBoxVisible !== this.state.messageBoxVisible
		) {
			this.updateRootLayoutSize();
		}

		if (prevProps.plugins !== this.props.plugins) {
			this.updateMainLayout(this.updateLayoutPluginViews(this.props.mainLayout, this.props.plugins));
			// this.setState({ layout: this.buildLayout(this.props.plugins) });
		}

		if (this.props.mainLayout !== prevProps.mainLayout) {
			const toSave = saveLayout(this.props.mainLayout);
			Setting.setValue('ui.layout', toSave);
		}

		if (prevState.promptOptions !== this.state.promptOptions) {
			this.props.dispatch({
				type: !prevState.promptOptions ? 'VISIBLE_DIALOGS_ADD' : 'VISIBLE_DIALOGS_REMOVE',
				name: 'promptDialog',
			});
		}

		if (this.props.isResettingLayout) {
			Setting.setValue('ui.layout', null);
			this.updateMainLayout(this.buildLayout(this.props.plugins));
			this.props.dispatch({
				type: 'RESET_LAYOUT',
				value: false,
			});
		}
	}

	public layoutModeListenerKeyDown(event: KeyboardEvent) {
		if (event.key !== 'Escape') return;
		if (!this.props.layoutMoveMode) return;
		void CommandService.instance().execute('toggleLayoutMoveMode');
	}

	public componentDidMount() {
		window.addEventListener('keydown', this.layoutModeListenerKeyDown);
	}

	public componentWillUnmount() {
		window.removeEventListener('resize', this.window_resize);
		window.removeEventListener('keydown', this.layoutModeListenerKeyDown);
	}


	public rootLayoutSize() {
		return {
			width: window.innerWidth,
			height: this.rowHeight(),
		};
	}

	public rowHeight() {
		if (!this.props) return 0;
		return this.props.style.height - (this.state.messageBoxVisible ? this.messageBoxHeight() : 0);
	}

	public messageBoxHeight() {
		return 50;
	}

	public styles(themeId: number, width: number, height: number, messageBoxVisible: boolean) {
		const styleKey = [themeId, width, height, messageBoxVisible].join('_');
		if (styleKey === this.styleKey_) return this.styles_;

		this.styleKey_ = styleKey;

		this.styles_ = {};

		this.styles_.header = {
			width: width,
		};

		const rowHeight = height - (messageBoxVisible ? this.messageBoxHeight() : 0);

		this.styles_.rowHeight = rowHeight;

		this.styles_.resizableLayout = {
			height: rowHeight,
		};

		this.styles_.prompt = {
			width: width,
			height: height,
		};

		return this.styles_;
	}

	public renderNotification() {
		return <WarningBanner
			height={this.messageBoxHeight()}
			onShow={() => this.setState({ messageBoxVisible: true })}
			onHide={() => this.setState({ messageBoxVisible: false })}
		/>;
	}

	private resizableLayout_resize(event: { layout: LayoutItem }) {
		this.updateMainLayout(event.layout);
	}

	private resizableLayout_moveButtonClick(event: MoveButtonClickEvent) {
		const newLayout = move(this.props.mainLayout, event.itemKey, event.direction);
		this.updateMainLayout(newLayout);
	}

	private resizableLayout_renderItem(key: string, event: RenderItemEvent): React.ReactNode {
		return <MainLayoutPane
			key={key}
			contentKey={key}
			event={event}
			windowId={defaultWindowId}
			onUpdateLayout={this.updateMainLayout}
			layout={this.props.mainLayout}
		/>;
	}

	public renderPluginDialogs() {
		const output = [];
		const infos = pluginUtils.viewInfosByType(this.props.plugins, 'webview');

		for (const info of infos) {
			const { plugin, view } = info;
			if (view.containerType !== ContainerType.Dialog) continue;
			if (!view.opened) continue;
			const html = this.props.pluginHtmlContents[plugin.id]?.[view.id] ?? '';

			output.push(<UserWebviewDialog
				key={view.id}
				viewId={view.id}
				themeId={this.props.themeId}
				html={html}
				scripts={view.scripts}
				pluginId={plugin.id}
				buttons={view.buttons}
				fitToContent={view.fitToContent}
			/>);
		}

		if (!output.length) return null;

		return (
			<StyledUserWebviewDialogContainer>
				{output}
			</StyledUserWebviewDialogContainer>
		);
	}

	private layoutKeyToLabel = (key: string) => {
		return layoutKeyToLabel(key, this.props.plugins);
	};

	public render() {
		const theme = themeStyle(this.props.themeId);
		const style = {
			color: theme.color,
			backgroundColor: theme.backgroundColor,
			...this.props.style,
		};
		const styles = this.styles(this.props.themeId, style.width, style.height, this.state.messageBoxVisible);

		const messageComp = this.renderNotification();

		const layoutComp = this.props.mainLayout ? (
			<ResizableLayout
				height={styles.rowHeight}
				layout={this.props.mainLayout}
				onResize={this.resizableLayout_resize}
				onMoveButtonClick={this.resizableLayout_moveButtonClick}
				renderItem={this.resizableLayout_renderItem}
				layoutKeyToLabel={this.layoutKeyToLabel}
				moveMode={this.props.layoutMoveMode}
				moveModeMessage={_('Use the arrows to move the layout items. Press "Escape" to exit.')}
			/>
		) : null;

		return (
			<div style={style}>
				<TrashNotification
					lastDeletion={this.props.lastDeletion}
					lastDeletionNotificationTime={this.props.lastDeletionNotificationTime}
					themeId={this.props.themeId}
					dispatch={this.props.dispatch as unknown as import('redux').Dispatch}
				/>
				<UpdateNotification />
				<PluginNotification
					themeId={this.props.themeId}
					toast={this.props.toast}
				/>
				{messageComp}
				{layoutComp}
			</div>
		);
	}
}

const mapStateToProps = (state: AppState) => {
	return {
		themeId: state.settings.theme,
		shouldUpgradeSyncTarget: state.settings['sync.upgradeState'] === Setting.SYNC_UPGRADE_STATE_SHOULD_DO,
		plugins: state.pluginService.plugins,
		pluginHtmlContents: state.pluginService.pluginHtmlContents,
		hasNotesBeingSaved: stateUtils.hasNotesBeingSaved(state),
		layoutMoveMode: state.layoutMoveMode,
		mainLayout: state.mainLayout,
		processingShareInvitationResponse: state.shareService.processingShareInvitationResponse,
		enableLegacyMarkdownEditor: state.settings['editor.legacyMarkdown'],
		isResettingLayout: state.isResettingLayout,
		lastDeletion: state.lastDeletion,
		lastDeletionNotificationTime: state.lastDeletionNotificationTime,
		toast: state.toast,
	};
};

export default connect(mapStateToProps)(MainScreenComponent);
