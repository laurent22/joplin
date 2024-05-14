import { useCallback, useMemo } from 'react';
import { ButtonSpec } from '../types';
import { _ } from '@joplin/lib/locale';
import { ButtonRowProps } from '../types';
import time from '@joplin/lib/time';
import { Keyboard, Platform } from 'react-native';

export interface ActionButtonRowProps extends ButtonRowProps {
	keyboardVisible: boolean;
	hasSoftwareKeyboard: boolean;
}

const useActionButtons = (props: ActionButtonRowProps) => {
	const onDismissKeyboard = useCallback(() => {
		// Keyboard.dismiss() doesn't dismiss the keyboard if it's editing the WebView.
		Keyboard.dismiss();

		// As such, dismiss the keyboard by sending a message to the View.
		props.editorControl.hideKeyboard();
	}, [props.editorControl]);

	const onSearch = useCallback(() => {
		if (props.searchState.dialogVisible) {
			props.editorControl.searchControl.hideSearch();
		} else {
			props.editorControl.searchControl.showSearch();
		}
	}, [props.editorControl, props.searchState.dialogVisible]);

	const onAttach = useCallback(() => {
		onDismissKeyboard();
		props.onAttach();
	}, [props.onAttach, onDismissKeyboard]);

	return useMemo(() => {
		const actionButtons: ButtonSpec[] = [];
		actionButtons.push({
			icon: 'fa calendar-plus',
			description: _('Insert time'),
			onPress: () => {
				props.editorControl.insertText(time.formatDateToLocal(new Date()));
			},
			disabled: props.readOnly,
		});

		actionButtons.push({
			icon: 'material attachment',
			description: _('Attach'),
			onPress: onAttach,
			disabled: props.readOnly,
		});

		actionButtons.push({
			icon: 'material magnify',
			description: (
				props.searchState.dialogVisible ? _('Close') : _('Find and replace')
			),
			active: props.searchState.dialogVisible,
			onPress: onSearch,

			priority: -3,
			disabled: props.readOnly,
		});

		actionButtons.push({
			icon: 'material keyboard-close',
			description: _('Hide keyboard'),
			disabled: !props.keyboardVisible,
			visible: props.hasSoftwareKeyboard && Platform.OS === 'ios',
			onPress: onDismissKeyboard,

			priority: -3,
		});

		return actionButtons;
	}, [
		props.editorControl, props.keyboardVisible, props.hasSoftwareKeyboard,
		props.readOnly, props.searchState.dialogVisible,
		onAttach, onDismissKeyboard, onSearch,
	]);
};

export default useActionButtons;
