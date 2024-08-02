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

		const maxWidth = size === DialogSize.Large ? windowSize.width : 500;
		const maxHeight = size === DialogSize.Large ? windowSize.height : 700;

		return StyleSheet.create({
			closeButtonContainer: {
				flexDirection: 'row',
				justifyContent: 'flex-end',
			},
			dialogContainer: {
				maxHeight,
				maxWidth,
				width: '100%',
				height: '100%',
				flexShrink: 1,

				// Center
				marginLeft: 'auto',
				marginRight: 'auto',
				paddingLeft: 6,
				paddingRight: 6,

				...containerStyle,
			},
			dialogSurface: {
				borderRadius: 12,
				backgroundColor: theme.backgroundColor,
				padding: 10,
				width: '100%',
				height: '100%',
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
			<Surface style={styles.dialogSurface} elevation={1}>
				{closeButton}
				{props.children}
			</Surface>
		</Modal>
	);
};

export default DismissibleDialog;
