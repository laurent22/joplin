import { useEffect, useRef } from 'react';
import { DialogState } from '../types';
import { Dispatch } from 'redux';

// Syncs whether dialogs are open/closed with the global reducer state.
const useSyncDialogState = (dialogState: DialogState, dispatch: Dispatch) => {
	const lastDialogStateRef = useRef(dialogState);
	useEffect(() => {
		const prevState = lastDialogStateRef.current;
		const state = dialogState;
		if (state.notePropertiesDialogOptions !== prevState.notePropertiesDialogOptions) {
			dispatch({
				type: state.notePropertiesDialogOptions && state.notePropertiesDialogOptions.visible ? 'VISIBLE_DIALOGS_ADD' : 'VISIBLE_DIALOGS_REMOVE',
				name: 'noteProperties',
			});
		}

		if (state.noteContentPropertiesDialogOptions !== prevState.noteContentPropertiesDialogOptions) {
			dispatch({
				type: state.noteContentPropertiesDialogOptions && state.noteContentPropertiesDialogOptions.visible ? 'VISIBLE_DIALOGS_ADD' : 'VISIBLE_DIALOGS_REMOVE',
				name: 'noteContentProperties',
			});
		}

		if (state.shareNoteDialogOptions !== prevState.shareNoteDialogOptions) {
			dispatch({
				type: state.shareNoteDialogOptions && state.shareNoteDialogOptions.visible ? 'VISIBLE_DIALOGS_ADD' : 'VISIBLE_DIALOGS_REMOVE',
				name: 'shareNote',
			});
		}

		if (state.shareFolderDialogOptions !== prevState.shareFolderDialogOptions) {
			dispatch({
				type: state.shareFolderDialogOptions && state.shareFolderDialogOptions.visible ? 'VISIBLE_DIALOGS_ADD' : 'VISIBLE_DIALOGS_REMOVE',
				name: 'shareFolder',
			});
		}
		lastDialogStateRef.current = dialogState;
	}, [dialogState, dispatch]);
};

export default useSyncDialogState;
