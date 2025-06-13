import * as React from 'react';
import { useMemo, useRef } from 'react';
import { DialogState } from '../types';
import { PrintCallback } from './usePrintToCallback';
import { _ } from '@joplin/lib/locale';
import announceForAccessibility from '../../utils/announceForAccessibility';

export interface WindowControl {
	setState: (update: Partial<DialogState>)=> void;
	printTo: PrintCallback;
	announcePanelVisibility(panelName: string, visible: boolean): void;
}

export type OnSetDialogState = React.Dispatch<React.SetStateAction<DialogState>>;
const useWindowControl = (setDialogState: OnSetDialogState, onPrint: PrintCallback) => {
	// Use refs to avoid reloading the output where possible -- reloading the window control
	// may mean reloading all main window commands.
	const onPrintRef = useRef(onPrint);
	onPrintRef.current = onPrint;

	return useMemo((): WindowControl => {
		return {
			setState: (newPartialState: Partial<DialogState>) => {
				setDialogState(oldState => ({
					...oldState,
					...newPartialState,
				}));
			},
			printTo: (target, options) => onPrintRef.current(target, options),
			announcePanelVisibility: (panelName, visible) => {
				announceForAccessibility(
					visible ? _('Panel "%s" is visible', panelName) : _('Panel %s is hidden', panelName),
				);
			},
		};
	}, [setDialogState]);
};

export default useWindowControl;
