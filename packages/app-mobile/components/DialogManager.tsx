import * as React from 'react';
import { createContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet } from 'react-native';
import { Button, Dialog, Portal, Text } from 'react-native-paper';
import Modal from './Modal';
import { _ } from '@joplin/lib/locale';
import shim from '@joplin/lib/shim';
import makeShowMessageBox from '../utils/makeShowMessageBox';

export interface PromptButton {
	text: string;
	onPress?: ()=> void;
	style?: 'cancel'|'default'|'destructive';
}

interface PromptOptions {
	cancelable?: boolean;
}

export interface DialogControl {
	prompt(title: string, message: string, buttons?: PromptButton[], options?: PromptOptions): void;
}

export const DialogContext = createContext<DialogControl>(null);

interface Props {
	children: React.ReactNode;
}

interface PromptDialogData {
	key: string;
	title: string;
	message: string;
	buttons: PromptButton[];
	onDismiss: (()=> void)|null;
}

const styles = StyleSheet.create({
	dialogContainer: {
		maxWidth: 400,
		minWidth: '50%',
		alignSelf: 'center',
	},
	modalContainer: {
		marginTop: 'auto',
		marginBottom: 'auto',
	},
});

const DialogManager: React.FC<Props> = props => {
	const [dialogModels, setPromptDialogs] = useState<PromptDialogData[]>([]);
	const nextDialogIdRef = useRef(0);

	const dialogControl: DialogControl = useMemo(() => {
		const defaultButtons = [{ text: _('OK') }];
		return {
			prompt: (title: string, message: string, buttons: PromptButton[] = defaultButtons, options?: PromptOptions) => {
				if (Platform.OS !== 'web') {
					// Alert.alert provides a more native style on iOS.
					Alert.alert(title, message, buttons, options);

					// Alert.alert doesn't work on web.
				} else {
					const onDismiss = () => {
						setPromptDialogs(dialogs => dialogs.filter(d => d !== dialog));
					};

					const cancelable = options?.cancelable ?? true;
					const dialog: PromptDialogData = {
						key: `dialog-${nextDialogIdRef.current++}`,
						title,
						message,
						buttons: buttons.map(button => ({
							...button,
							onPress: () => {
								onDismiss();
								button.onPress?.();
							},
						})),
						onDismiss: cancelable ? onDismiss : null,
					};

					setPromptDialogs(dialogs => {
						return [
							...dialogs,
							dialog,
						];
					});
				}
			},
		};
	}, []);
	const dialogControlRef = useRef(dialogControl);
	dialogControlRef.current = dialogControl;

	useEffect(() => {
		shim.showMessageBox = makeShowMessageBox(dialogControlRef);

		return () => {
			dialogControlRef.current = null;
		};
	}, []);

	const dialogComponents: React.ReactNode[] = [];
	for (const dialog of dialogModels) {
		const buttons = dialog.buttons.map((button, index) => {
			return (
				<Button key={`${index}-${button.text}`} onPress={button.onPress}>{button.text}</Button>
			);
		});
		dialogComponents.push(
			<Dialog
				testID={'prompt-dialog'}
				style={styles.dialogContainer}
				key={dialog.key}
				visible={true}
				onDismiss={dialog.onDismiss}
			>
				<Dialog.Title>{dialog.title}</Dialog.Title>
				<Dialog.Content>
					<Text variant='bodyMedium'>{dialog.message}</Text>
				</Dialog.Content>
				<Dialog.Actions>
					{buttons}
				</Dialog.Actions>
			</Dialog>,
		);
	}

	// Web: Use a <Modal> wrapper for better keyboard focus handling.
	return <>
		<DialogContext.Provider value={dialogControl}>
			{props.children}
		</DialogContext.Provider>
		<Portal>
			<Modal
				visible={!!dialogComponents.length}
				containerStyle={styles.modalContainer}
				animationType='none'
				backgroundColor='rgba(0, 0, 0, 0.1)'
				transparent={true}
				onRequestClose={dialogModels[dialogComponents.length - 1]?.onDismiss}
			>
				{dialogComponents}
			</Modal>
		</Portal>
	</>;
};

export default DialogManager;
