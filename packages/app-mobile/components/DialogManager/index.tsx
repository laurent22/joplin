import * as React from 'react';
import { createContext, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, ViewStyle } from 'react-native';
import { Portal } from 'react-native-paper';
import Modal from '../Modal';
import shim from '@joplin/lib/shim';
import makeShowMessageBox from '../../utils/makeShowMessageBox';
import { DialogControl, DialogData, DialogType } from './types';
import useDialogControl from './hooks/useDialogControl';
import PromptDialog from './PromptDialog';
import { themeStyle } from '../global-style';
import TextInputDialog from './TextInputDialog';

export type { DialogControl } from './types';
export const DialogContext = createContext<DialogControl>(null);

interface Props {
	themeId: number;
	children: React.ReactNode;
}

const useStyles = (themeId: number) => {
	const windowSize = useWindowDimensions();

	return useMemo(() => {
		const theme = themeStyle(themeId);
		const dialogContainer = {
			backgroundColor: theme.backgroundColor,
			borderRadius: theme.borderRadius,
			paddingTop: theme.marginTop,
			marginLeft: 'auto',
			marginRight: 'auto',

			width: '100%',
		} satisfies ViewStyle;

		return StyleSheet.create({
			modalContainer: {
				marginLeft: 'auto',
				marginRight: 'auto',
				marginTop: 'auto',
				marginBottom: 'auto',
				paddingHorizontal: 4,
				width: Math.max(windowSize.width / 2, 360),
				maxWidth: '100%',
			},

			dialogContainer: dialogContainer,
			promptDialogContainer: {
				...dialogContainer,
				maxWidth: 450,
			},
		});
	}, [windowSize.width, themeId]);
};

const DialogManager: React.FC<Props> = props => {
	const [dialogModels, setPromptDialogs] = useState<DialogData[]>([]);

	const dialogControl = useDialogControl(setPromptDialogs);
	const dialogControlRef = useRef(dialogControl);
	dialogControlRef.current = dialogControl;

	useEffect(() => {
		shim.showMessageBox = makeShowMessageBox(dialogControlRef);

		return () => {
			dialogControlRef.current = null;
		};
	}, []);

	const theme = themeStyle(props.themeId);
	const styles = useStyles(props.themeId);

	const dialogComponents: React.ReactNode[] = [];
	for (const dialog of dialogModels) {
		if (dialog.type === DialogType.Menu || dialog.type === DialogType.ButtonPrompt) {
			dialogComponents.push(
				<PromptDialog
					dialog={dialog}
					containerStyle={dialog.type === DialogType.ButtonPrompt ? styles.promptDialogContainer : styles.dialogContainer}
					themeId={props.themeId}
					key={dialog.key}
				/>,
			);
		} else if (dialog.type === DialogType.TextInput) {
			dialogComponents.push(
				<TextInputDialog
					dialog={dialog}
					containerStyle={styles.promptDialogContainer}
					themeId={props.themeId}
					key={dialog.key}
				/>,
			);
		} else {
			const exhaustivenessCheck: never = dialog.type;
			throw new Error(`Unexpected dialog type ${exhaustivenessCheck}`);
		}
	}

	// Web: Use a <Modal> wrapper for better keyboard focus handling.
	return <>
		<DialogContext.Provider value={dialogControl}>
			{props.children}
		</DialogContext.Provider>
		<Portal>
			<Modal
				visible={!!dialogComponents.length}
				scrollOverflow={true}
				containerStyle={styles.modalContainer}
				backgroundColor={theme.backgroundColorTransparent2}
				onClose={dialogModels[dialogComponents.length - 1]?.onDismiss}
			>
				{dialogComponents}
			</Modal>
		</Portal>
	</>;
};

export default DialogManager;
