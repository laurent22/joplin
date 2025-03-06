import * as React from 'react';
import { useMemo, useRef } from 'react';
import { DialogState } from '../types';
import { PrintCallback } from './usePrintToCallback';

export interface WindowControl {
	setState: (update: Partial<DialogState>)=> void;
	printTo: PrintCallback;
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
		};
	}, [setDialogState]);
};

export default useWindowControl;
