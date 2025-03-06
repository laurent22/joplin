import * as React from 'react';
import PromptDialog from '../PromptDialog';
import ShareFolderDialog from '../ShareFolderDialog/ShareFolderDialog';
import NotePropertiesDialog from '../NotePropertiesDialog';
import NoteContentPropertiesDialog from '../NoteContentPropertiesDialog';
import ShareNoteDialog from '../ShareNoteDialog';
import { PluginHtmlContents, PluginStates } from '@joplin/lib/services/plugins/reducer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DialogState } from './types';
import { connect } from 'react-redux';
import { AppState, AppStateDialog, VisibleDialogs } from '../../app.reducer';
import { Dispatch } from 'redux';
import ModalMessageOverlay from './ModalMessageOverlay';
import { EditorNoteStatuses, stateUtils } from '@joplin/lib/reducer';
import dialogs from '../dialogs';
import useDocument from '../hooks/useDocument';
import useWindowCommands from './utils/useWindowCommands';
import PluginDialogs from './PluginDialogs';
import useSyncDialogState from './utils/useSyncDialogState';
import AppDialogs from './AppDialogs';

const PluginManager = require('@joplin/lib/services/PluginManager');

interface Props {
	dispatch: Dispatch;
	themeId: number;
	plugins: PluginStates;
	pluginHtmlContents: PluginHtmlContents;
	visibleDialogs: VisibleDialogs;
	appDialogStates: AppStateDialog[];
	pluginsLegacy: unknown;
	modalMessage: string|null;

	customCss: string;
	editorNoteStatuses: EditorNoteStatuses;
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

// Certain dialog libraries need a reference to the active window:
const useSyncActiveWindow = (containerWindow: Window|null) => {
	useEffect(() => {
		if (!containerWindow) return () => {};

		const onFocusCallback = () => {
			dialogs.setActiveWindow(containerWindow);
		};
		if (containerWindow.document.hasFocus()) {
			onFocusCallback();
		}

		containerWindow.addEventListener('focus', onFocusCallback);

		return () => {
			containerWindow.removeEventListener('focus', onFocusCallback);
		};
	}, [containerWindow]);
};

const WindowCommandsAndDialogs: React.FC<Props> = props => {
	const [referenceElement, setReferenceElement] = useState(null);
	const containerDocument = useDocument(referenceElement);

	const documentRef = useRef<Document|null>(null);
	documentRef.current = containerDocument;

	const [dialogState, setDialogState] = useState<DialogState>(defaultDialogState);

	useSyncDialogState(dialogState, props.dispatch);
	useWindowCommands({
		documentRef,
		customCss: props.customCss,
		plugins: props.plugins,
		editorNoteStatuses: props.editorNoteStatuses,
		setDialogState,
	});
	useSyncActiveWindow(containerDocument?.defaultView);

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

	const promptOnClose = useCallback((answer: unknown, buttonType: unknown) => {
		dialogState.promptOptions.onClose(answer, buttonType);
	}, [dialogState.promptOptions]);

	const dialogInfo = PluginManager.instance().pluginDialogToShow(props.pluginsLegacy);
	const pluginDialog = !dialogInfo ? null : <dialogInfo.Dialog {...dialogInfo.props} />;

	const { noteContentPropertiesDialogOptions, notePropertiesDialogOptions, shareNoteDialogOptions, shareFolderDialogOptions, promptOptions } = dialogState;


	return <>
		<div ref={setReferenceElement}/>
		{pluginDialog}
		{props.modalMessage !== null ? <ModalMessageOverlay message={props.modalMessage}/> : null}
		<PluginDialogs
			themeId={props.themeId}
			visibleDialogs={props.visibleDialogs}
			pluginHtmlContents={props.pluginHtmlContents}
			plugins={props.plugins}
		/>
		<AppDialogs
			appDialogStates={props.appDialogStates}
			themeId={props.themeId}
			dispatch={props.dispatch}
		/>
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
			onClose={promptOnClose}
			label={promptOptions ? promptOptions.label : ''}
			description={promptOptions ? promptOptions.description : null}
			visible={!!promptOptions}
			buttons={promptOptions && 'buttons' in promptOptions ? promptOptions.buttons : null}
			inputType={promptOptions && 'inputType' in promptOptions ? promptOptions.inputType : null}
		/>
	</>;
};

interface ConnectProps {
	windowId: string;
}

export default connect((state: AppState, ownProps: ConnectProps) => {
	const windowState = stateUtils.windowStateById(state, ownProps.windowId);

	return {
		themeId: state.settings.theme,
		plugins: state.pluginService.plugins,
		visibleDialogs: windowState.visibleDialogs,
		appDialogStates: windowState.dialogs,
		pluginHtmlContents: state.pluginService.pluginHtmlContents,
		customCss: state.customViewerCss,
		editorNoteStatuses: state.editorNoteStatuses,
		pluginsLegacy: state.pluginsLegacy,
		modalMessage: state.modalOverlayMessage,
	};
})(WindowCommandsAndDialogs);
