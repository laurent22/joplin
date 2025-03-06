import * as React from 'react';
import { Alert, Platform } from 'react-native';
import { DialogControl, DialogType, MenuChoice, PromptButtonSpec, PromptDialogData, PromptOptions } from '../types';
import { _ } from '@joplin/lib/locale';
import { useMemo, useRef } from 'react';

type SetPromptDialogs = React.Dispatch<React.SetStateAction<PromptDialogData[]>>;

const useDialogControl = (setPromptDialogs: SetPromptDialogs) => {
	const nextDialogIdRef = useRef(0);

	const dialogControl: DialogControl = useMemo(() => {
		const onDismiss = (dialog: PromptDialogData) => {
			setPromptDialogs(dialogs => dialogs.filter(d => d !== dialog));
		};

		const defaultButtons = [{ text: _('OK') }];
		const control: DialogControl = {
			info: (message: string) => {
				return new Promise<void>((resolve) => {
					control.prompt(_('Info'), message, [{
						text: _('OK'),
						onPress: () => resolve(),
					}]);
				});
			},
			error: (message: string) => {
				return new Promise<void>((resolve) => {
					control.prompt(_('Error'), message, [{
						text: _('OK'),
						onPress: () => resolve(),
					}]);
				});
			},
			prompt: (title: string, message: string, buttons: PromptButtonSpec[] = defaultButtons, options?: PromptOptions) => {
				// Alert.alert doesn't work on web.
				if (Platform.OS !== 'web') {
					// Note: Alert.alert provides a more native style on iOS.
					Alert.alert(title, message, buttons, options);
				} else {
					const cancelable = options?.cancelable ?? true;
					const dialog: PromptDialogData = {
						type: DialogType.Prompt,
						key: `dialog-${nextDialogIdRef.current++}`,
						title,
						message,
						buttons: buttons.map(button => ({
							...button,
							onPress: () => {
								onDismiss(dialog);
								button.onPress?.();
							},
						})),
						onDismiss: cancelable ? () => onDismiss(dialog) : null,
					};

					setPromptDialogs(dialogs => {
						return [
							...dialogs,
							dialog,
						];
					});
				}
			},
			showMenu: function<T>(title: string, choices: MenuChoice<T>[]) {
				return new Promise<T>((resolve) => {
					const dismiss = () => onDismiss(dialog);

					const dialog: PromptDialogData = {
						type: DialogType.Menu,
						key: `menu-dialog-${nextDialogIdRef.current++}`,
						title: '',
						message: title,
						buttons: choices.map(({ id, ...buttonProps }) => ({
							...buttonProps,
							onPress: () => {
								dismiss();
								resolve(id);
							},
						})),
						onDismiss: dismiss,
					};
					setPromptDialogs(dialogs => {
						return [
							...dialogs,
							dialog,
						];
					});
				});
			},
		};

		return control;
	}, [setPromptDialogs]);
	return dialogControl;
};

export default useDialogControl;
