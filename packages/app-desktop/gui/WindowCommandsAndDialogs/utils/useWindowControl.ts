import * as React from 'react';
import { useMemo, useRef } from 'react';
import { DialogState } from '../types';
import { PrintCallback } from './usePrintToCallback';
import { _ } from '@joplin/lib/locale';
import announceForAccessibility from '../../utils/announceForAccessibility';

interface PromptSuggestion<T> {
	key: string;
	value: T;
	label: string;
	indentDepth?: number;
}

interface PromptOptions<T> {
	label: string;
	value: string;
	suggestions: PromptSuggestion<T>[];
}

export interface WindowControl {
	setState: (update: Partial<DialogState>)=> void;
	showPrompt: <T>(options: PromptOptions<T>)=> Promise<T>;
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
		const control: WindowControl = {
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
			showPrompt: <T> (options: PromptOptions<T>) => {
				return new Promise<T>((resolve) => {
					control.setState({
						promptOptions: {
							label: options.label,
							inputType: 'dropdown',
							value: options.value,
							autocomplete: options.suggestions,
							// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Partially refactored code before rule was applied
							onClose: async (answer: any) => {
								if (answer) {
									resolve(answer.value);
								} else {
									resolve(null);
								}
								control.setState({ promptOptions: null });
							},
						},
					});
				});
			},
		};
		return control;
	}, [setDialogState]);
};

export default useWindowControl;
