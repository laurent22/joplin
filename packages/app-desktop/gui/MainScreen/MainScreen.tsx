import * as React from 'react';
import ResizableLayout from '../ResizableLayout/ResizableLayout';
import findItemByKey from '../ResizableLayout/utils/findItemByKey';
import { MoveButtonClickEvent } from '../ResizableLayout/MoveButtons';
import { move } from '../ResizableLayout/utils/movements';
import { LayoutItem } from '../ResizableLayout/utils/types';
import NoteEditor from '../NoteEditor/NoteEditor';
import NoteContentPropertiesDialog from '../NoteContentPropertiesDialog';
import ShareNoteDialog from '../ShareNoteDialog';
import CommandService from '@joplin/lib/services/CommandService';
import { PluginStates, utils as pluginUtils } from '@joplin/lib/services/plugins/reducer';
import Sidebar from '../Sidebar/Sidebar';
import UserWebview from '../../services/plugins/UserWebview';
import UserWebviewDialog from '../../services/plugins/UserWebviewDialog';
import { ContainerType } from '@joplin/lib/services/plugins/WebviewController';
import { stateUtils } from '@joplin/lib/reducer';
import InteropServiceHelper from '../../InteropServiceHelper';
import { _ } from '@joplin/lib/locale';
import NoteListWrapper from '../NoteListWrapper/NoteListWrapper';
import { AppState } from '../../app';
import { saveLayout, loadLayout } from '../ResizableLayout/utils/persist';
import Setting from '@joplin/lib/models/Setting';
import produce from 'immer';
import shim from '@joplin/lib/shim';
import bridge from '../../services/bridge';
import time from '@joplin/lib/time';
import styled from 'styled-components';
import { themeStyle } from '@joplin/lib/theme';
import validateLayout from '../ResizableLayout/utils/validateLayout';
import iterateItems from '../ResizableLayout/utils/iterateItems';
import removeItem from '../ResizableLayout/utils/removeItem';

const { connect } = require('react-redux');
const { PromptDialog } = require('../PromptDialog.min.js');
const NotePropertiesDialog = require('../NotePropertiesDialog.min.js');
const PluginManager = require('@joplin/lib/services/PluginManager');
import  EncryptionService from '@joplin/lib/services/EncryptionService';
const ipcRenderer = require('electron').ipcRenderer;

interface LayerModalState {
	visible: boolean;
	message: string;
}

interface Props {
	plugins: PluginStates;
	pluginsLoaded: boolean;
	hasNotesBeingSaved: boolean;
	dispatch: Function;
	mainLayout: LayoutItem;
	style: any;
	layoutMoveMode: boolean;
	editorNoteStatuses: any;
	customCss: string;
	shouldUpgradeSyncTarget: boolean;
	hasDisabledSyncItems: boolean;
	hasDisabledEncryptionItems: boolean;
	showMissingMasterKeyMessage: boolean;
	showNeedUpgradingMasterKeyMessage: boolean;
	showShouldReencryptMessage: boolean;
	focusedField: string;
	themeId: number;
	settingEditorCodeView: boolean;
	pluginsLegacy: any;
}

interface State {
	promptOptions: any;
	modalLayer: LayerModalState;
	notePropertiesDialogOptions: any;
	noteContentPropertiesDialogOptions: any;
	shareNoteDialogOptions: any;
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
		{ key: 'editor' },
	],
};

const commands = [
	require('./commands/editAlarm'),
	require('./commands/exportPdf'),
	require('./commands/hideModalMessage'),
	require('./commands/moveToFolder'),
	require('./commands/newNote'),
	require('./commands/newFolder'),
	require('./commands/newSubFolder'),
	require('./commands/newTodo'),
	require('./commands/print'),
	require('./commands/renameFolder'),
	require('./commands/renameTag'),
	require('./commands/search'),
	require('./commands/selectTemplate'),
	require('./commands/setTags'),
	require('./commands/showModalMessage'),
	require('./commands/showNoteContentProperties'),
	require('./commands/showNoteProperties'),
	require('./commands/showShareNoteDialog'),
	require('./commands/showSpellCheckerMenu'),
	require('./commands/toggleEditors'),
	require('./commands/toggleNoteList'),
	require('./commands/toggleSideBar'),
	require('./commands/toggleVisiblePanes'),
	require('./commands/toggleLayoutMoveMode'),
	require('./commands/openNote'),
	require('./commands/openFolder'),
	require('./commands/openTag'),
];

class MainScreenComponent extends React.Component<Props, State> {

	private waitForNotesSavedIID_: any;
	private isPrinting_: boolean;
	private styleKey_: string;
	private styles_: any;
	private promptOnClose_: Function;

	constructor(props: Props) {
		super(props);

		this.state = {
			promptOptions: null,
			modalLayer: {
				visible: false,
				message: '',
			},
			notePropertiesDialogOptions: {},
			noteContentPropertiesDialogOptions: {},
			shareNoteDialogOptions: {},
		};

		this.updateMainLayout(this.buildLayout(props.plugins));

		this.registerCommands();

		this.setupAppCloseHandling();

		this.notePropertiesDialog_close = this.notePropertiesDialog_close.bind(this);
		this.noteContentPropertiesDialog_close = this.noteContentPropertiesDialog_close.bind(this);
		this.shareNoteDialog_close = this.shareNoteDialog_close.bind(this);
		this.resizableLayout_resize = this.resizableLayout_resize.bind(this);
		this.resizableLayout_renderItem = this.resizableLayout_renderItem.bind(this);
		this.resizableLayout_moveButtonClick = this.resizableLayout_moveButtonClick.bind(this);
		this.window_resize = this.window_resize.bind(this);
		this.rowHeight = this.rowHeight.bind(this);
		this.layoutModeListenerKeyDown = this.layoutModeListenerKeyDown.bind(this);

		window.addEventListener('resize', this.window_resize);
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
			if (item.context && item.context.pluginId && !pluginIds.includes(item.context.pluginId)) {
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

		const userLayout = Setting.value('ui.layout');
		let output = null;

		try {
			output = loadLayout(Object.keys(userLayout).length ? userLayout : null, defaultLayout, rootLayoutSize);

			if (!findItemByKey(output, 'sideBar') || !findItemByKey(output, 'noteList') || !findItemByKey(output, 'editor')) {
				throw new Error('"sideBar", "noteList" and "editor" must be present in the layout');
			}
		} catch (error) {
			console.warn('Could not load layout - restoring default layout:', error);
			console.warn('Layout was:', userLayout);
			output = loadLayout(null, defaultLayout, rootLayoutSize);
		}

		return this.updateLayoutPluginViews(output, plugins);
	}

	window_resize() {
		this.updateRootLayoutSize();
	}

	setupAppCloseHandling() {
		this.waitForNotesSavedIID_ = null;

		// This event is dispached from the main process when the app is about
		// to close. The renderer process must respond with the "appCloseReply"
		// and tell the main process whether the app can really be closed or not.
		// For example, it cannot be closed right away if a note is being saved.
		// If a note is being saved, we wait till it is saved and then call
		// "appCloseReply" again.
		ipcRenderer.on('appClose', () => {
			if (this.waitForNotesSavedIID_) shim.clearInterval(this.waitForNotesSavedIID_);
			this.waitForNotesSavedIID_ = null;

			ipcRenderer.send('asynchronous-message', 'appCloseReply', {
				canClose: !this.props.hasNotesBeingSaved,
			});

			if (this.props.hasNotesBeingSaved) {
				this.waitForNotesSavedIID_ = shim.setInterval(() => {
					if (!this.props.hasNotesBeingSaved) {
						shim.clearInterval(this.waitForNotesSavedIID_);
						this.waitForNotesSavedIID_ = null;
						ipcRenderer.send('asynchronous-message', 'appCloseReply', {
							canClose: true,
						});
					}
				}, 50);
			}
		});
	}

	notePropertiesDialog_close() {
		this.setState({ notePropertiesDialogOptions: {} });
	}

	noteContentPropertiesDialog_close() {
		this.setState({ noteContentPropertiesDialogOptions: {} });
	}

	shareNoteDialog_close() {
		this.setState({ shareNoteDialogOptions: {} });
	}

	updateMainLayout(layout: LayoutItem) {
		this.props.dispatch({
			type: 'MAIN_LAYOUT_SET',
			value: layout,
		});
	}

	updateRootLayoutSize() {
		this.updateMainLayout(produce(this.props.mainLayout, (draft: any) => {
			const s = this.rootLayoutSize();
			draft.width = s.width;
			draft.height = s.height;
		}));
	}

	componentDidUpdate(prevProps: Props, prevState: State) {
		if (prevProps.style.width !== this.props.style.width ||
			prevProps.style.height !== this.props.style.height ||
			this.messageBoxVisible(prevProps) !== this.messageBoxVisible(this.props)
		) {
			this.updateRootLayoutSize();
		}

		if (prevProps.plugins !== this.props.plugins) {
			this.updateMainLayout(this.updateLayoutPluginViews(this.props.mainLayout, this.props.plugins));
			// this.setState({ layout: this.buildLayout(this.props.plugins) });
		}

		if (this.state.notePropertiesDialogOptions !== prevState.notePropertiesDialogOptions) {
			this.props.dispatch({
				type: this.state.notePropertiesDialogOptions && this.state.notePropertiesDialogOptions.visible ? 'VISIBLE_DIALOGS_ADD' : 'VISIBLE_DIALOGS_REMOVE',
				name: 'noteProperties',
			});
		}

		if (this.state.noteContentPropertiesDialogOptions !== prevState.noteContentPropertiesDialogOptions) {
			this.props.dispatch({
				type: this.state.noteContentPropertiesDialogOptions && this.state.noteContentPropertiesDialogOptions.visible ? 'VISIBLE_DIALOGS_ADD' : 'VISIBLE_DIALOGS_REMOVE',
				name: 'noteContentProperties',
			});
		}

		if (this.state.shareNoteDialogOptions !== prevState.shareNoteDialogOptions) {
			this.props.dispatch({
				type: this.state.shareNoteDialogOptions && this.state.shareNoteDialogOptions.visible ? 'VISIBLE_DIALOGS_ADD' : 'VISIBLE_DIALOGS_REMOVE',
				name: 'shareNote',
			});
		}

		if (this.props.mainLayout !== prevProps.mainLayout) {
			const toSave = saveLayout(this.props.mainLayout);
			Setting.setValue('ui.layout', toSave);
		}
	}

	layoutModeListenerKeyDown(event: any) {
		if (event.key !== 'Escape') return;
		if (!this.props.layoutMoveMode) return;
		void CommandService.instance().execute('toggleLayoutMoveMode');
	}

	componentDidMount() {
		window.addEventListener('keydown', this.layoutModeListenerKeyDown);
	}

	componentWillUnmount() {
		this.unregisterCommands();

		window.removeEventListener('resize', this.window_resize);
		window.removeEventListener('keydown', this.layoutModeListenerKeyDown);
	}

	async waitForNoteToSaved(noteId: string) {
		while (noteId && this.props.editorNoteStatuses[noteId] === 'saving') {
			console.info('Waiting for note to be saved...', this.props.editorNoteStatuses);
			await time.msleep(100);
		}
	}

	async printTo_(target: string, options: any) {
		// Concurrent print calls are disallowed to avoid incorrect settings being restored upon completion
		if (this.isPrinting_) {
			console.info(`Printing ${options.path} to ${target} disallowed, already printing.`);
			return;
		}

		this.isPrinting_ = true;

		// Need to wait for save because the interop service reloads the note from the database
		await this.waitForNoteToSaved(options.noteId);

		if (target === 'pdf') {
			try {
				const pdfData = await InteropServiceHelper.exportNoteToPdf(options.noteId, {
					printBackground: true,
					pageSize: Setting.value('export.pdfPageSize'),
					landscape: Setting.value('export.pdfPageOrientation') === 'landscape',
					customCss: this.props.customCss,
					plugins: this.props.plugins,
				});
				await shim.fsDriver().writeFile(options.path, pdfData, 'buffer');
			} catch (error) {
				console.error(error);
				bridge().showErrorMessageBox(error.message);
			}
		} else if (target === 'printer') {
			try {
				await InteropServiceHelper.printNote(options.noteId, {
					printBackground: true,
					customCss: this.props.customCss,
				});
			} catch (error) {
				console.error(error);
				bridge().showErrorMessageBox(error.message);
			}
		}
		this.isPrinting_ = false;
	}

	rootLayoutSize() {
		return {
			width: window.innerWidth,
			height: this.rowHeight(),
		};
	}

	rowHeight() {
		if (!this.props) return 0;
		return this.props.style.height - (this.messageBoxVisible() ? this.messageBoxHeight() : 0);
	}

	messageBoxHeight() {
		return 50;
	}

	styles(themeId: number, width: number, height: number, messageBoxVisible: boolean) {
		const styleKey = [themeId, width, height, messageBoxVisible].join('_');
		if (styleKey === this.styleKey_) return this.styles_;

		const theme = themeStyle(themeId);

		this.styleKey_ = styleKey;

		this.styles_ = {};

		this.styles_.header = {
			width: width,
		};

		this.styles_.messageBox = {
			width: width,
			height: this.messageBoxHeight(),
			display: 'flex',
			alignItems: 'center',
			paddingLeft: 10,
			backgroundColor: theme.warningBackgroundColor,
		};

		const rowHeight = height - (messageBoxVisible ? this.styles_.messageBox.height : 0);

		this.styles_.rowHeight = rowHeight;

		this.styles_.resizableLayout = {
			height: rowHeight,
		};

		this.styles_.prompt = {
			width: width,
			height: height,
		};

		this.styles_.modalLayer = Object.assign({}, theme.textStyle, {
			zIndex: 10000,
			position: 'absolute',
			top: 0,
			left: 0,
			backgroundColor: theme.backgroundColor,
			width: width - 20,
			height: height - 20,
			padding: 10,
		});

		return this.styles_;
	}

	renderNotification(theme: any, styles: any) {
		if (!this.messageBoxVisible()) return null;

		const onViewStatusScreen = () => {
			this.props.dispatch({
				type: 'NAV_GO',
				routeName: 'Status',
			});
		};

		const onViewEncryptionConfigScreen = () => {
			this.props.dispatch({
				type: 'NAV_GO',
				routeName: 'Config',
				props: {
					defaultSection: 'encryption',
				},
			});
		};

		const onRestartAndUpgrade = async () => {
			Setting.setValue('sync.upgradeState', Setting.SYNC_UPGRADE_STATE_MUST_DO);
			await Setting.saveAll();
			bridge().restart();
		};

		let msg = null;
		if (this.props.shouldUpgradeSyncTarget) {
			msg = (
				<span>
					{_('The sync target needs to be upgraded before Joplin can sync. The operation may take a few minutes to complete and the app needs to be restarted. To proceed please click on the link.')}{' '}
					<a href="#" onClick={() => onRestartAndUpgrade()}>
						{_('Restart and upgrade')}
					</a>
				</span>
			);
		} else if (this.props.hasDisabledSyncItems) {
			msg = (
				<span>
					{_('Some items cannot be synchronised.')}{' '}
					<a href="#" onClick={() => onViewStatusScreen()}>
						{_('View them now')}
					</a>
				</span>
			);
		} else if (this.props.hasDisabledEncryptionItems) {
			msg = (
				<span>
					{_('Some items cannot be decrypted.')}{' '}
					<a href="#" onClick={() => onViewStatusScreen()}>
						{_('View them now')}
					</a>
				</span>
			);
		} else if (this.props.showMissingMasterKeyMessage) {
			msg = (
				<span>
					{_('One or more master keys need a password.')}{' '}
					<a href="#" onClick={() => onViewEncryptionConfigScreen()}>
						{_('Set the password')}
					</a>
				</span>
			);
		} else if (this.props.showNeedUpgradingMasterKeyMessage) {
			msg = (
				<span>
					{_('One of your master keys use an obsolete encryption method.')}{' '}
					<a href="#" onClick={() => onViewEncryptionConfigScreen()}>
						{_('View them now')}
					</a>
				</span>
			);
		} else if (this.props.showShouldReencryptMessage) {
			msg = (
				<span>
					{_('The default encryption method has been changed, you should re-encrypt your data.')}{' '}
					<a href="#" onClick={() => onViewEncryptionConfigScreen()}>
						{_('More info')}
					</a>
				</span>
			);
		}

		return (
			<div style={styles.messageBox}>
				<span style={theme.textStyle}>{msg}</span>
			</div>
		);
	}

	messageBoxVisible(props: any = null) {
		if (!props) props = this.props;
		return props.hasDisabledSyncItems || props.showMissingMasterKeyMessage || props.showNeedUpgradingMasterKeyMessage || props.showShouldReencryptMessage || props.hasDisabledEncryptionItems || this.props.shouldUpgradeSyncTarget;
	}

	registerCommands() {
		for (const command of commands) {
			CommandService.instance().registerRuntime(command.declaration.name, command.runtime(this));
		}
	}

	unregisterCommands() {
		for (const command of commands) {
			CommandService.instance().unregisterRuntime(command.declaration.name);
		}
	}

	resizableLayout_resize(event: any) {
		this.updateMainLayout(event.layout);
	}

	resizableLayout_moveButtonClick(event: MoveButtonClickEvent) {
		const newLayout = move(this.props.mainLayout, event.itemKey, event.direction);
		this.updateMainLayout(newLayout);
	}

	resizableLayout_renderItem(key: string, event: any) {
		const eventEmitter = event.eventEmitter;

		// const viewsToRemove:string[] = [];

		const components: any = {
			sideBar: () => {
				return <Sidebar key={key} />;
			},

			noteList: () => {
				return <NoteListWrapper
					key={key}
					resizableLayoutEventEmitter={eventEmitter}
					visible={event.visible}
					focusedField={this.props.focusedField}
					size={event.size}
					themeId={this.props.themeId}
				/>;
			},

			editor: () => {
				const bodyEditor = this.props.settingEditorCodeView ? 'CodeMirror' : 'TinyMCE';
				return <NoteEditor key={key} bodyEditor={bodyEditor} />;
			},
		};

		if (components[key]) return components[key]();

		if (key.indexOf('plugin-view') === 0) {
			const viewInfo = pluginUtils.viewInfoByViewId(this.props.plugins, event.item.key);

			if (!viewInfo) {
				// Note that it will happen when the component is rendered
				// before the plugins have loaded their views, so because of
				// this we need to keep the view in the layout.
				//
				// But it can also be a problem if the view really is invalid
				// due to a faulty plugin as currently there would be no way to
				// remove it.
				console.warn(`Could not find plugin associated with view: ${event.item.key}`);
				return null;
			} else {
				const { view, plugin } = viewInfo;

				return <UserWebview
					key={view.id}
					viewId={view.id}
					themeId={this.props.themeId}
					html={view.html}
					scripts={view.scripts}
					pluginId={plugin.id}
					borderBottom={true}
					fitToContent={false}
				/>;
			}
		} else {
			throw new Error(`Invalid layout component: ${key}`);
		}

		// if (viewsToRemove.length) {
		// 	window.requestAnimationFrame(() => {
		// 		let newLayout = this.props.mainLayout;
		// 		for (const itemKey of viewsToRemove) {
		// 			newLayout = removeItem(newLayout, itemKey);
		// 		}

		// 		if (newLayout !== this.props.mainLayout) {
		// 			console.warn('Removed invalid views:', viewsToRemove);
		// 			this.updateMainLayout(newLayout);
		// 		}
		// 	});
		// }
	}

	renderPluginDialogs() {
		const output = [];
		const infos = pluginUtils.viewInfosByType(this.props.plugins, 'webview');

		for (const info of infos) {
			const { plugin, view } = info;
			if (view.containerType !== ContainerType.Dialog) continue;
			if (!view.opened) continue;

			output.push(<UserWebviewDialog
				key={view.id}
				viewId={view.id}
				themeId={this.props.themeId}
				html={view.html}
				scripts={view.scripts}
				pluginId={plugin.id}
				buttons={view.buttons}
			/>);
		}

		if (!output.length) return null;

		return (
			<StyledUserWebviewDialogContainer>
				{output}
			</StyledUserWebviewDialogContainer>
		);
	}

	render() {
		const theme = themeStyle(this.props.themeId);
		const style = Object.assign(
			{
				color: theme.color,
				backgroundColor: theme.backgroundColor,
			},
			this.props.style
		);
		const promptOptions = this.state.promptOptions;
		const styles = this.styles(this.props.themeId, style.width, style.height, this.messageBoxVisible());

		if (!this.promptOnClose_) {
			this.promptOnClose_ = (answer: any, buttonType: any) => {
				return this.state.promptOptions.onClose(answer, buttonType);
			};
		}

		const messageComp = this.renderNotification(theme, styles);

		const dialogInfo = PluginManager.instance().pluginDialogToShow(this.props.pluginsLegacy);
		const pluginDialog = !dialogInfo ? null : <dialogInfo.Dialog {...dialogInfo.props} />;

		const modalLayerStyle = Object.assign({}, styles.modalLayer, { display: this.state.modalLayer.visible ? 'block' : 'none' });

		const notePropertiesDialogOptions = this.state.notePropertiesDialogOptions;
		const noteContentPropertiesDialogOptions = this.state.noteContentPropertiesDialogOptions;
		const shareNoteDialogOptions = this.state.shareNoteDialogOptions;

		const layoutComp = this.props.mainLayout ? (
			<ResizableLayout
				height={styles.rowHeight}
				layout={this.props.mainLayout}
				onResize={this.resizableLayout_resize}
				onMoveButtonClick={this.resizableLayout_moveButtonClick}
				renderItem={this.resizableLayout_renderItem}
				moveMode={this.props.layoutMoveMode}
				moveModeMessage={_('Use the arrows to move the layout items. Press "Escape" to exit.')}
			/>
		) : null;

		return (
			<div style={style}>
				<div style={modalLayerStyle}>{this.state.modalLayer.message}</div>
				{this.renderPluginDialogs()}
				{noteContentPropertiesDialogOptions.visible && <NoteContentPropertiesDialog markupLanguage={noteContentPropertiesDialogOptions.markupLanguage} themeId={this.props.themeId} onClose={this.noteContentPropertiesDialog_close} text={noteContentPropertiesDialogOptions.text}/>}
				{notePropertiesDialogOptions.visible && <NotePropertiesDialog themeId={this.props.themeId} noteId={notePropertiesDialogOptions.noteId} onClose={this.notePropertiesDialog_close} onRevisionLinkClick={notePropertiesDialogOptions.onRevisionLinkClick} />}
				{shareNoteDialogOptions.visible && <ShareNoteDialog themeId={this.props.themeId} noteIds={shareNoteDialogOptions.noteIds} onClose={this.shareNoteDialog_close} />}

				<PromptDialog autocomplete={promptOptions && 'autocomplete' in promptOptions ? promptOptions.autocomplete : null} defaultValue={promptOptions && promptOptions.value ? promptOptions.value : ''} themeId={this.props.themeId} style={styles.prompt} onClose={this.promptOnClose_} label={promptOptions ? promptOptions.label : ''} description={promptOptions ? promptOptions.description : null} visible={!!this.state.promptOptions} buttons={promptOptions && 'buttons' in promptOptions ? promptOptions.buttons : null} inputType={promptOptions && 'inputType' in promptOptions ? promptOptions.inputType : null} />

				{messageComp}
				{layoutComp}
				{pluginDialog}
			</div>
		);
	}
}

const mapStateToProps = (state: AppState) => {
	return {
		themeId: state.settings.theme,
		settingEditorCodeView: state.settings['editor.codeView'],
		folders: state.folders,
		notes: state.notes,
		hasDisabledSyncItems: state.hasDisabledSyncItems,
		hasDisabledEncryptionItems: state.hasDisabledEncryptionItems,
		showMissingMasterKeyMessage: state.notLoadedMasterKeys.length && state.masterKeys.length,
		showNeedUpgradingMasterKeyMessage: !!EncryptionService.instance().masterKeysThatNeedUpgrading(state.masterKeys).length,
		showShouldReencryptMessage: state.settings['encryption.shouldReencrypt'] >= Setting.SHOULD_REENCRYPT_YES,
		shouldUpgradeSyncTarget: state.settings['sync.upgradeState'] === Setting.SYNC_UPGRADE_STATE_SHOULD_DO,
		selectedFolderId: state.selectedFolderId,
		selectedNoteId: state.selectedNoteIds.length === 1 ? state.selectedNoteIds[0] : null,
		pluginsLegacy: state.pluginsLegacy,
		plugins: state.pluginService.plugins,
		templates: state.templates,
		customCss: state.customCss,
		editorNoteStatuses: state.editorNoteStatuses,
		hasNotesBeingSaved: stateUtils.hasNotesBeingSaved(state),
		focusedField: state.focusedField,
		layoutMoveMode: state.layoutMoveMode,
		mainLayout: state.mainLayout,
	};
};

export default connect(mapStateToProps)(MainScreenComponent);
