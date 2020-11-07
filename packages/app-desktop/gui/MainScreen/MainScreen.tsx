import * as React from 'react';
import ResizableLayout, { findItemByKey, LayoutItem, LayoutItemDirection, allDynamicSizes } from '../ResizableLayout/ResizableLayout';
import NoteList from '../NoteList/NoteList';
import NoteEditor from '../NoteEditor/NoteEditor';
import NoteContentPropertiesDialog from '../NoteContentPropertiesDialog';
import ShareNoteDialog from '../ShareNoteDialog';
import NoteListControls from '../NoteListControls/NoteListControls';
import CommandService from '@joplin/lib/services/CommandService';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import { utils as pluginUtils } from '@joplin/lib/services/plugins/reducer';
import SideBar from '../SideBar/SideBar';
import UserWebview from '../../services/plugins/UserWebview';
import UserWebviewDialog from '../../services/plugins/UserWebviewDialog';
import { ContainerType } from '@joplin/lib/services/plugins/WebviewController';
import { stateUtils } from '@joplin/lib/reducer';
import InteropServiceHelper from '../../InteropServiceHelper';
import { _ } from '@joplin/lib/locale';

const produce = require('immer').default;
const { connect } = require('react-redux');
const { PromptDialog } = require('../PromptDialog.min.js');
const NotePropertiesDialog = require('../NotePropertiesDialog.min.js');
const Setting = require('@joplin/lib/models/Setting').default;
const shim = require('@joplin/lib/shim').default;
const { themeStyle } = require('@joplin/lib/theme.js');
const bridge = require('electron').remote.require('./bridge').default;
const PluginManager = require('@joplin/lib/services/PluginManager');
const EncryptionService = require('@joplin/lib/services/EncryptionService');
const ipcRenderer = require('electron').ipcRenderer;
const time = require('@joplin/lib/time').default;
const styled = require('styled-components').default;

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
	require('./commands/toggleEditors'),
	require('./commands/toggleNoteList'),
	require('./commands/toggleSideBar'),
	require('./commands/toggleVisiblePanes'),
	require('./commands/openNote'),
	require('./commands/openFolder'),
	require('./commands/openTag'),
];

class MainScreenComponent extends React.Component<any, any> {

	waitForNotesSavedIID_:any;
	isPrinting_:boolean;
	styleKey_:string;
	styles_:any;
	promptOnClose_:Function;

	constructor(props:any) {
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
			layout: this.buildLayout(props.plugins),
		};

		this.registerCommands();

		this.setupAppCloseHandling();

		this.notePropertiesDialog_close = this.notePropertiesDialog_close.bind(this);
		this.noteContentPropertiesDialog_close = this.noteContentPropertiesDialog_close.bind(this);
		this.shareNoteDialog_close = this.shareNoteDialog_close.bind(this);
		this.userWebview_message = this.userWebview_message.bind(this);
		this.resizableLayout_resize = this.resizableLayout_resize.bind(this);
		this.resizableLayout_renderItem = this.resizableLayout_renderItem.bind(this);
		this.window_resize = this.window_resize.bind(this);
		this.rowHeight = this.rowHeight.bind(this);

		window.addEventListener('resize', this.window_resize);
	}

	buildLayout(plugins:any):LayoutItem {
		const rootLayoutSize = this.rootLayoutSize();
		const theme = themeStyle(this.props.themeId);
		const sideBarMinWidth = 200;

		const sizes = {
			sideBarColumn: {
				width: 150,
			},
			noteListColumn: {
				width: 150,
			},
			pluginColumn: {
				width: 150,
			},
			...Setting.value('ui.layout'),
		};

		for (const k in sizes) {
			if (sizes[k].width < sideBarMinWidth) sizes[k].width = sideBarMinWidth;
		}

		const pluginColumnChildren:LayoutItem[] = [];

		const infos = pluginUtils.viewInfosByType(plugins, 'webview');

		for (const info of infos) {
			if (info.view.containerType !== ContainerType.Panel) continue;

			// For now it's assumed all views go in the "pluginColumn" so they are
			// resizable vertically. But horizontally they stretch 100%
			const viewId = info.view.id;

			const size = {
				...(sizes[viewId] ? sizes[viewId] : null),
				width: '100%',
			};

			pluginColumnChildren.push({
				key: viewId,
				resizableBottom: true,
				context: {
					plugin: info.plugin,
					control: info.view,
				},
				...size,
			});
		}

		return {
			key: 'root',
			direction: LayoutItemDirection.Row,
			width: rootLayoutSize.width,
			height: rootLayoutSize.height,
			children: [
				{
					key: 'sideBarColumn',
					direction: LayoutItemDirection.Column,
					resizableRight: true,
					width: sizes.sideBarColumn.width,
					visible: Setting.value('sidebarVisibility'),
					minWidth: sideBarMinWidth,
					children: [
						{
							key: 'sideBar',
						},
					],
				},
				{
					key: 'noteListColumn',
					direction: LayoutItemDirection.Column,
					resizableRight: true,
					width: sizes.noteListColumn.width,
					visible: Setting.value('noteListVisibility'),
					minWidth: sideBarMinWidth,
					children: [
						{
							height: theme.topRowHeight,
							key: 'noteListControls',
						},
						{
							key: 'noteList',
						},
					],
				},
				{
					key: 'pluginColumn',
					direction: LayoutItemDirection.Column,
					resizableRight: true,
					width: sizes.pluginColumn.width,
					visible: !!pluginColumnChildren.length,
					minWidth: sideBarMinWidth,
					children: pluginColumnChildren,
				},
				{
					key: 'editorColumn',
					direction: LayoutItemDirection.Column,
					children: [
						{
							key: 'editor',
						},
					],
				},
			],
		};
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

	updateRootLayoutSize() {
		this.setState({ layout: produce(this.state.layout, (draft:any) => {
			const s = this.rootLayoutSize();
			draft.width = s.width;
			draft.height = s.height;
		}) });
	}

	componentDidUpdate(prevProps:any, prevState:any) {
		if (this.props.noteListVisibility !== prevProps.noteListVisibility || this.props.sidebarVisibility !== prevProps.sidebarVisibility) {
			this.setState({ layout: produce(this.state.layout, (draft:any) => {
				const noteListColumn = findItemByKey(draft, 'noteListColumn');
				noteListColumn.visible = this.props.noteListVisibility;

				const sideBarColumn = findItemByKey(draft, 'sideBarColumn');
				sideBarColumn.visible = this.props.sidebarVisibility;
			}) });
		}

		if (prevProps.style.width !== this.props.style.width ||
			prevProps.style.height !== this.props.style.height ||
			this.messageBoxVisible(prevProps) !== this.messageBoxVisible(this.props)
		) {
			this.updateRootLayoutSize();
		}

		if (prevProps.plugins !== this.props.plugins) {
			this.setState({ layout: this.buildLayout(this.props.plugins) });
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
	}

	componentDidMount() {
		this.updateRootLayoutSize();
	}

	componentWillUnmount() {
		this.unregisterCommands();

		window.removeEventListener('resize', this.window_resize);
	}

	toggleSideBar() {
		this.props.dispatch({
			type: 'SIDEBAR_VISIBILITY_TOGGLE',
		});
	}

	toggleNoteList() {
		this.props.dispatch({
			type: 'NOTELIST_VISIBILITY_TOGGLE',
		});
	}

	async waitForNoteToSaved(noteId:string) {
		while (noteId && this.props.editorNoteStatuses[noteId] === 'saving') {
			console.info('Waiting for note to be saved...', this.props.editorNoteStatuses);
			await time.msleep(100);
		}
	}

	async printTo_(target:string, options:any) {
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

	styles(themeId:number, width:number, height:number, messageBoxVisible:boolean, isSidebarVisible:any, isNoteListVisible:any) {
		const styleKey = [themeId, width, height, messageBoxVisible, +isSidebarVisible, +isNoteListVisible].join('_');
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

	renderNotification(theme:any, styles:any) {
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

	messageBoxVisible(props:any = null) {
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

	userWebview_message(event:any) {
		PluginService.instance().pluginById(event.pluginId).viewController(event.viewId).emitMessage(event);
	}

	resizableLayout_resize(event:any) {
		this.setState({ layout: event.layout });
		Setting.setValue('ui.layout', allDynamicSizes(event.layout));
	}

	resizableLayout_renderItem(key:string, event:any) {
		const eventEmitter = event.eventEmitter;

		if (key === 'sideBar') {
			return <SideBar key={key} />;
		} else if (key === 'noteList') {
			return <NoteList key={key} resizableLayoutEventEmitter={eventEmitter} size={event.size} visible={event.visible}/>;
		} else if (key === 'editor') {
			const bodyEditor = this.props.settingEditorCodeView ? 'CodeMirror' : 'TinyMCE';
			return <NoteEditor key={key} bodyEditor={bodyEditor} />;
		} else if (key === 'noteListControls') {
			return <NoteListControls key={key} showNewNoteButtons={this.props.focusedField !== 'globalSearch'} />;
		} else if (key.indexOf('plugin-view') === 0) {
			const { control, plugin } = event.item.context;
			return <UserWebview
				key={control.id}
				viewId={control.id}
				themeId={this.props.themeId}
				html={control.html}
				scripts={control.scripts}
				pluginId={plugin.id}
				onMessage={this.userWebview_message}
				borderBottom={true}
				fitToContent={false}
			/>;
		}

		throw new Error(`Invalid layout component: ${key}`);
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
				onMessage={this.userWebview_message}
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
		const sidebarVisibility = this.props.sidebarVisibility;
		const noteListVisibility = this.props.noteListVisibility;
		const styles = this.styles(this.props.themeId, style.width, style.height, this.messageBoxVisible(), sidebarVisibility, noteListVisibility);

		if (!this.promptOnClose_) {
			this.promptOnClose_ = (answer:any, buttonType:any) => {
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

		return (
			<div style={style}>
				<div style={modalLayerStyle}>{this.state.modalLayer.message}</div>
				{this.renderPluginDialogs()}
				{noteContentPropertiesDialogOptions.visible && <NoteContentPropertiesDialog markupLanguage={noteContentPropertiesDialogOptions.markupLanguage} themeId={this.props.themeId} onClose={this.noteContentPropertiesDialog_close} text={noteContentPropertiesDialogOptions.text}/>}
				{notePropertiesDialogOptions.visible && <NotePropertiesDialog themeId={this.props.themeId} noteId={notePropertiesDialogOptions.noteId} onClose={this.notePropertiesDialog_close} onRevisionLinkClick={notePropertiesDialogOptions.onRevisionLinkClick} />}
				{shareNoteDialogOptions.visible && <ShareNoteDialog themeId={this.props.themeId} noteIds={shareNoteDialogOptions.noteIds} onClose={this.shareNoteDialog_close} />}

				<PromptDialog autocomplete={promptOptions && 'autocomplete' in promptOptions ? promptOptions.autocomplete : null} defaultValue={promptOptions && promptOptions.value ? promptOptions.value : ''} themeId={this.props.themeId} style={styles.prompt} onClose={this.promptOnClose_} label={promptOptions ? promptOptions.label : ''} description={promptOptions ? promptOptions.description : null} visible={!!this.state.promptOptions} buttons={promptOptions && 'buttons' in promptOptions ? promptOptions.buttons : null} inputType={promptOptions && 'inputType' in promptOptions ? promptOptions.inputType : null} />

				{messageComp}
				<ResizableLayout
					width={this.state.width}
					height={styles.rowHeight}
					layout={this.state.layout}
					onResize={this.resizableLayout_resize}
					renderItem={this.resizableLayout_renderItem}
				/>
				{pluginDialog}
			</div>
		);
	}
}

const mapStateToProps = (state:any) => {
	return {
		themeId: state.settings.theme,
		settingEditorCodeView: state.settings['editor.codeView'],
		sidebarVisibility: state.sidebarVisibility,
		noteListVisibility: state.noteListVisibility,
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
	};
};

export default connect(mapStateToProps)(MainScreenComponent);
