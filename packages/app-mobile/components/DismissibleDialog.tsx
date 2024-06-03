import * as React from 'react';
import { useMemo } from 'react';
import { StyleSheet, View, ViewStyle, useWindowDimensions } from 'react-native';
import { IconButton, Surface } from 'react-native-paper';
import { themeStyle } from './global-style';
import Modal from './Modal';
import { _ } from '@joplin/lib/locale';

export enum DialogSize {
	Small = 'small',

	// Ideal for panels and dialogs that should be fullscreen even on large devices
	Large = 'large',
}

interface Props {
	themeId: number;
	visible: boolean;
	onDismiss: ()=> void;
	containerStyle?: ViewStyle;
	children: React.ReactNode;

	size: DialogSize;
}

const useStyles = (themeId: number, containerStyle: ViewStyle, size: DialogSize) => {
	const windowSize = useWindowDimensions();

	return useMemo(() => {
		const theme = themeStyle(themeId);

		const maxWidth = size === DialogSize.Large ? Infinity : 500;
		const maxHeight = size === DialogSize.Large ? Infinity : 700;

		return StyleSheet.create({
			webView: {
				backgroundColor: 'transparent',
				display: 'flex',
			},
			webViewContainer: {
				flexGrow: 1,
				flexShrink: 1,
			},
			closeButtonContainer: {
				flexDirection: 'row',
				justifyContent: 'flex-end',
			},
			dialog: {
				backgroundColor: theme.backgroundColor,
				borderRadius: 12,
				padding: 10,

				// Use Math.min with width and height -- the maxWidth and maxHeight style
				// properties don't seem to limit the size for this.
				height: Math.min(maxHeight, windowSize.height * 0.9),
				width: Math.min(maxWidth, windowSize.width * 0.97),
				flexShrink: 1,

				// Center
				marginLeft: 'auto',
				marginRight: 'auto',

				...containerStyle,
			},
			dialogContainer: {
				display: 'flex',
				flexDirection: 'row',
				justifyContent: 'center',
				alignItems: 'center',
				flexGrow: 1,
			},
		});
	}, [themeId, windowSize.width, windowSize.height, containerStyle, size]);
};

const DismissibleDialog: React.FC<Props> = props => {
	const styles = useStyles(props.themeId, props.containerStyle, props.size);

	const closeButton = (
		<View style={styles.closeButtonContainer}>
			<IconButton
				icon='close'
				accessibilityLabel={_('Close')}
				onPress={props.onDismiss}
			/>
		</View>
	);

	return (
		<Modal
			visible={props.visible}
			onDismiss={props.onDismiss}
			onRequestClose={props.onDismiss}
			containerStyle={styles.dialogContainer}
			animationType='fade'
			backgroundColor='rgba(0, 0, 0, 0.1)'
			transparent={true}
		>
			<Surface style={styles.dialog} elevation={1}>
				{closeButton}
				{props.children}
			</Surface>
		</Modal>
	);
};

export default DismissibleDialog;
