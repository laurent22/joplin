import * as React from 'react';
import { createContext, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Button, Dialog, Portal, Text } from 'react-native-paper';

interface PromptButton {
	text: string;
	onPress?: ()=> void;
	style?: 'cancel'|'destructive';
}

interface PromptOptions {
	cancelable?: boolean;
}

export interface DialogControl {
	prompt(title: string, message: string, buttons: PromptButton[], options?: PromptOptions): void;
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
});

const DialogManager: React.FC<Props> = props => {
	const [promptDialogs, setPromptDialogs] = useState<PromptDialogData[]>([]);
	const nextDialogIdRef = useRef(0);

	const dialogControl: DialogControl = useMemo(() => {
		return {
			prompt: (title: string, message: string, buttons: PromptButton[], options?: PromptOptions) => {
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
			},
		};
	}, []);

	const dialogComponents: React.ReactNode[] = [];
	for (const dialog of promptDialogs) {
		const buttons = dialog.buttons.map(button => {
			return (
				<Button onPress={button.onPress}>{button.text}</Button>
			);
		});
		dialogComponents.push(
			<Dialog style={styles.dialogContainer} key={dialog.key} visible={true} onDismiss={dialog.onDismiss}>
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

	return <>
		<DialogContext.Provider value={dialogControl}>
			{props.children}
		</DialogContext.Provider>
		<Portal>
			{dialogComponents}
		</Portal>
	</>;
};

export default DialogManager;
