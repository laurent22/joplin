import * as React from 'react';
import PromptDialog from '../PromptDialog';
import ShareFolderDialog from '../ShareFolderDialog/ShareFolderDialog';
import NotePropertiesDialog from '../NotePropertiesDialog';
import NoteContentPropertiesDialog from '../NoteContentPropertiesDialog';
import ShareNoteDialog from '../ShareNoteDialog';
import { PluginHtmlContents, PluginStates, utils as pluginUtils } from '@joplin/lib/services/plugins/reducer';
import { ContainerType } from '@joplin/lib/services/plugins/WebviewController';
import UserWebviewDialog from '../../services/plugins/UserWebviewDialog';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DialogState } from './types';
import usePrintToCallback from './utils/usePrintToCallback';
import { connect } from 'react-redux';
import { AppState } from '../../app.reducer';
import useWindowControl, { WindowControl } from './utils/useWindowControl';
import commands from './commands';
import CommandService, { CommandRuntime, ComponentCommandSpec } from '@joplin/lib/services/CommandService';
import { Dispatch } from 'redux';
import ModalMessageOverlay from './ModalMessageOverlay';

const PluginManager = require('@joplin/lib/services/PluginManager');

interface Props {
	dispatch: Dispatch;
	themeId: number;
	plugins: PluginStates;
	pluginHtmlContents: PluginHtmlContents;
	pluginsLegacy: unknown;
	modalMessage: string|null;

	customCss: string;
	editorNoteStatuses: Record<string, string>;
}

const defaultDialogState: DialogState = {
	noteContentPropertiesDialogOptions: {
		visible: false,
	},
	shareNoteDialogOptions: {
		visible: false,
	},
	notePropertiesDialogOptions: {
		visible: false,
	},
	shareFolderDialogOptions: {
		visible: false,
	},
	promptOptions: null,
};

const DialogAndCommandHandler: React.FC<Props> = props => {
	const [dialogState, setDialogState] = useState<DialogState>(defaultDialogState);

	const lastDialogStateRef = useRef(dialogState);
	useEffect(() => {
		const prevState = lastDialogStateRef.current;
		const state = dialogState;
		if (state.notePropertiesDialogOptions !== prevState.notePropertiesDialogOptions) {
			props.dispatch({
				type: state.notePropertiesDialogOptions && state.notePropertiesDialogOptions.visible ? 'VISIBLE_DIALOGS_ADD' : 'VISIBLE_DIALOGS_REMOVE',
				name: 'noteProperties',
			});
		}

		if (state.noteContentPropertiesDialogOptions !== prevState.noteContentPropertiesDialogOptions) {
			props.dispatch({
				type: state.noteContentPropertiesDialogOptions && state.noteContentPropertiesDialogOptions.visible ? 'VISIBLE_DIALOGS_ADD' : 'VISIBLE_DIALOGS_REMOVE',
				name: 'noteContentProperties',
			});
		}

		if (state.shareNoteDialogOptions !== prevState.shareNoteDialogOptions) {
			props.dispatch({
				type: state.shareNoteDialogOptions && state.shareNoteDialogOptions.visible ? 'VISIBLE_DIALOGS_ADD' : 'VISIBLE_DIALOGS_REMOVE',
				name: 'shareNote',
			});
		}

		if (state.shareFolderDialogOptions !== prevState.shareFolderDialogOptions) {
			props.dispatch({
				type: state.shareFolderDialogOptions && state.shareFolderDialogOptions.visible ? 'VISIBLE_DIALOGS_ADD' : 'VISIBLE_DIALOGS_REMOVE',
				name: 'shareFolder',
			});
		}
		lastDialogStateRef.current = dialogState;
	}, [dialogState, props.dispatch]);

	const onPrintCallback = usePrintToCallback({
		customCss: props.customCss,
		editorNoteStatuses: props.editorNoteStatuses,
		plugins: props.plugins,
	});
	const windowControl = useWindowControl(setDialogState, onPrintCallback);

	const documentRef = useRef<Document|null>(null);
	useEffect(() => {
		const runtimeHandles = commands.map((command: ComponentCommandSpec<WindowControl>) => {
			const runtime: CommandRuntime = {
				getPriority: () => {
					return documentRef.current?.hasFocus() ? 1 : 0;
				},
				...command.runtime(windowControl),
			};
			return CommandService.instance().registerRuntime(
				command.declaration.name,
				runtime,
				true,
			);
		});

		return () => {
			for (const runtimeHandle of runtimeHandles) {
				runtimeHandle.deregister();
			}
		};
	}, [windowControl]);

	const onDialogHideCallbacks = useMemo(() => {
		type OnHideCallbacks = Partial<Record<keyof DialogState, ()=> void>>;
		const result: OnHideCallbacks = {};
		for (const key of Object.keys(defaultDialogState)) {
			result[key as keyof DialogState] = () => {
				setDialogState(dialogState => {
					return {
						...dialogState,
						[key]: { visible: false },
					};
				});
			};
		}
		return result;
	}, []);

	const renderPluginDialogs = () => {
		const output = [];
		const infos = pluginUtils.viewInfosByType(props.plugins, 'webview');

		for (const info of infos) {
			const { plugin, view } = info;
			if (view.containerType !== ContainerType.Dialog) continue;
			if (!view.opened) continue;
			const html = props.pluginHtmlContents[plugin.id]?.[view.id] ?? '';

			output.push(<UserWebviewDialog
				key={view.id}
				viewId={view.id}
				themeId={props.themeId}
				html={html}
				scripts={view.scripts}
				pluginId={plugin.id}
				buttons={view.buttons}
				fitToContent={view.fitToContent}
			/>);
		}

		if (!output.length) return null;

		return (
			<div className='user-webview-dialog-container'>
				{output}
			</div>
		);
	};

	const promptOnClose = useCallback((answer: unknown, buttonType: unknown) => {
		dialogState.promptOptions.onClose(answer, buttonType);
	}, [dialogState.promptOptions]);

	const onReferenceElementLoad = useCallback((element: HTMLDivElement|null) => {
		if (!element) return;

		documentRef.current ??= element.getRootNode() as Document;
	}, []);

	const dialogInfo = PluginManager.instance().pluginDialogToShow(props.pluginsLegacy);
	const pluginDialog = !dialogInfo ? null : <dialogInfo.Dialog {...dialogInfo.props} />;

	const { noteContentPropertiesDialogOptions, notePropertiesDialogOptions, shareNoteDialogOptions, shareFolderDialogOptions, promptOptions } = dialogState;


	return <>
		<div ref={onReferenceElementLoad}/>
		{pluginDialog}
		{props.modalMessage !== null ? <ModalMessageOverlay message={props.modalMessage}/> : null}
		{renderPluginDialogs()}
		{noteContentPropertiesDialogOptions.visible && (
			<NoteContentPropertiesDialog
				markupLanguage={noteContentPropertiesDialogOptions.markupLanguage}
				themeId={props.themeId}
				onClose={onDialogHideCallbacks.noteContentPropertiesDialogOptions}
				text={noteContentPropertiesDialogOptions.text}
			/>
		)}
		{notePropertiesDialogOptions.visible && (
			<NotePropertiesDialog
				themeId={props.themeId}
				noteId={notePropertiesDialogOptions.noteId}
				onClose={onDialogHideCallbacks.notePropertiesDialogOptions}
				onRevisionLinkClick={notePropertiesDialogOptions.onRevisionLinkClick}
			/>
		)}
		{shareNoteDialogOptions.visible && (
			<ShareNoteDialog
				themeId={props.themeId}
				noteIds={shareNoteDialogOptions.noteIds}
				onClose={onDialogHideCallbacks.shareNoteDialogOptions}
			/>
		)}
		{shareFolderDialogOptions.visible && (
			<ShareFolderDialog
				themeId={props.themeId}
				folderId={shareFolderDialogOptions.folderId}
				onClose={onDialogHideCallbacks.shareFolderDialogOptions}
			/>
		)}

		<PromptDialog
			autocomplete={promptOptions && 'autocomplete' in promptOptions ? promptOptions.autocomplete : null}
			defaultValue={promptOptions && promptOptions.value ? promptOptions.value : ''}
			themeId={props.themeId}
			// TODO: Don't hardcode. Instead, use CSS.
			style={{ width: window.innerWidth, height: window.innerHeight }}
			onClose={promptOnClose}
			label={promptOptions ? promptOptions.label : ''}
			description={promptOptions ? promptOptions.description : null}
			visible={!!promptOptions}
			buttons={promptOptions && 'buttons' in promptOptions ? promptOptions.buttons : null}
			inputType={promptOptions && 'inputType' in promptOptions ? promptOptions.inputType : null}
		/>
	</>;
};

export default connect((state: AppState) => ({
	themeId: state.settings.theme,
	plugins: state.pluginService.plugins,
	pluginHtmlContents: state.pluginService.pluginHtmlContents,
	customCss: state.customCss,
	editorNoteStatuses: state.editorNoteStatuses,
	pluginsLegacy: state.pluginsLegacy,
	modalMessage: state.modalOverlayMessage,
}))(DialogAndCommandHandler);
