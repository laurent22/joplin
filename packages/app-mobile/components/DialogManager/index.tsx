import * as React from 'react';
import { createContext, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Portal } from 'react-native-paper';
import Modal from '../Modal';
import shim from '@joplin/lib/shim';
import makeShowMessageBox from '../../utils/makeShowMessageBox';
import { DialogControl, PromptDialogData } from './types';
import useDialogControl from './hooks/useDialogControl';
import PromptDialog from './PromptDialog';

export type { DialogControl } from './types';
export const DialogContext = createContext<DialogControl>(null);

interface Props {
	themeId: number;
	children: React.ReactNode;
}

const useStyles = () => {
	const windowSize = useWindowDimensions();

	return useMemo(() => {
		return StyleSheet.create({
			modalContainer: {
				marginLeft: 'auto',
				marginRight: 'auto',
				marginTop: 'auto',
				marginBottom: 'auto',
				width: Math.max(windowSize.width / 2, 400),
				maxWidth: '100%',
			},
		});
	}, [windowSize.width]);
};

const DialogManager: React.FC<Props> = props => {
	const [dialogModels, setPromptDialogs] = useState<PromptDialogData[]>([]);

	const dialogControl = useDialogControl(setPromptDialogs);
	const dialogControlRef = useRef(dialogControl);
	dialogControlRef.current = dialogControl;

	useEffect(() => {
		shim.showMessageBox = makeShowMessageBox(dialogControlRef);

		return () => {
			dialogControlRef.current = null;
		};
	}, []);

	const styles = useStyles();

	const dialogComponents: React.ReactNode[] = [];
	for (const dialog of dialogModels) {
		dialogComponents.push(
			<PromptDialog
				key={dialog.key}
				dialog={dialog}
				themeId={props.themeId}
			/>,
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
				scrollOverflow={true}
				containerStyle={styles.modalContainer}
				animationType='fade'
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
