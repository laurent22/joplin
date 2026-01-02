import * as React from 'react';
import { useMemo } from 'react';
import { StyleSheet, View, ViewStyle, useWindowDimensions } from 'react-native';
import { IconButton, Surface, Text } from 'react-native-paper';
import { themeStyle } from './global-style';
import Modal from './Modal';
import { _ } from '@joplin/lib/locale';

export enum DialogVariant {
	// Small width, auto-determined height
	SmallResize = 'small-resize',

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
	heading?: string;
	scrollOverflow?: boolean;

	size: DialogVariant;
}

const useStyles = (themeId: number, containerStyle: ViewStyle, size: DialogVariant) => {
	const windowSize = useWindowDimensions();

	return useMemo(() => {
		const theme = themeStyle(themeId);

		const maxWidth = size === DialogVariant.Large ? windowSize.width : 500;
		const maxHeight = size === DialogVariant.Large ? windowSize.height : 700;

		const dialogSizing: ViewStyle = {
			width: '100%',

			...(size !== DialogVariant.SmallResize ? {
				height: '100%',
			} : { }),
		};

		return StyleSheet.create({
			closeButtonRow: {
				flexDirection: 'row',
				justifyContent: 'space-between',
				alignContent: 'center',
				marginBottom: 8,
			},
			closeButtonRowWithHeading: {
				marginBottom: 16,
			},
			closeButton: {
				margin: 0,
			},
			// Ensure that the close button is aligned with the center of the header:
			// Make its container smaller and center it.
			closeButtonWrapper: {
				height: 18,
				flexDirection: 'column',
				justifyContent: 'center',
				alignSelf: 'center',
			},
			heading: {
				// Without flexShrink/flexGrow, the heading can push the close button
				// outside of the dialog.
				flexShrink: 1,
				flexGrow: 1,
			},
			modalBackground: {
				justifyContent: 'center',
			},
			dialogContainer: {
				maxHeight,
				maxWidth,
				...dialogSizing,

				// Center
				marginLeft: 'auto',
				marginRight: 'auto',
				paddingLeft: 6,
				paddingRight: 6,

				...containerStyle,
			},
			dialogSurface: {
				borderRadius: 24,
				backgroundColor: theme.backgroundColor,
				paddingHorizontal: 16,
				paddingVertical: 24,
				...dialogSizing,
			},
		});
	}, [themeId, windowSize.width, windowSize.height, containerStyle, size]);
};

const DismissibleDialog: React.FC<Props> = props => {
	const theme = themeStyle(props.themeId);
	const styles = useStyles(props.themeId, props.containerStyle, props.size);

	const heading = props.heading ? (
		<Text variant='headlineSmall' role='heading' style={styles.heading}>{props.heading}</Text>
	) : null;
	const closeButtonRow = (
		<View style={[styles.closeButtonRow, !!props.heading && styles.closeButtonRowWithHeading]}>
			{heading ?? <View/>}
			<View style={styles.closeButtonWrapper}>
				<IconButton
					icon='close'
					accessibilityLabel={_('Close')}
					onPress={props.onDismiss}
					style={styles.closeButton}
				/>
			</View>
		</View>
	);

	return (
		<Modal
			visible={props.visible}
			onDismiss={props.onDismiss}
			onRequestClose={props.onDismiss}
			containerStyle={styles.dialogContainer}
			modalBackgroundStyle={styles.modalBackground}
			animationType='fade'
			backgroundColor={theme.backgroundColorTransparent2}
			transparent={true}
			scrollOverflow={props.scrollOverflow}
			// Allows the modal background to extend under the statusbar
			statusBarTranslucent
		>
			<Surface style={styles.dialogSurface} elevation={1}>
				{closeButtonRow}
				{props.children}
			</Surface>
		</Modal>
	);
};

export default DismissibleDialog;
