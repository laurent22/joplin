import * as React from 'react';
import { useMemo } from 'react';
import { Modal, ModalProps, StyleSheet, View, ViewStyle, useWindowDimensions } from 'react-native';
import { hasNotch } from 'react-native-device-info';

interface ModalElementProps extends ModalProps {
	children: React.ReactNode;
	containerStyle?: ViewStyle;
	backgroundColor?: string;
}

const useStyles = (backgroundColor?: string) => {
	const { width: windowWidth, height: windowHeight } = useWindowDimensions();
	const isLandscape = windowWidth > windowHeight;
	return useMemo(() => {
		return StyleSheet.create({
			contentWrapper: isLandscape ? {
				marginRight: hasNotch() ? 60 : 0,
				marginLeft: hasNotch() ? 60 : 0,
				marginTop: 15,
				marginBottom: 15,
			} : {
				marginTop: hasNotch() ? 65 : 15,
				marginBottom: hasNotch() ? 35 : 15,
			},
			modalBackground: { backgroundColor, flexGrow: 1 },
		});
	}, [isLandscape, backgroundColor]);
};

const ModalElement: React.FC<ModalElementProps> = ({
	children,
	containerStyle,
	backgroundColor,
	...modalProps
}) => {
	const styles = useStyles(backgroundColor);

	// contentWrapper adds padding. To allow styling the region outside of the modal
	// (e.g. to add a background), the content is wrapped twice.
	const content = (
		<View style={[styles.contentWrapper, containerStyle]}>
			{children}
		</View>
	);

	// supportedOrientations: On iOS, this allows the dialog to be shown in non-portrait orientations.
	return (
		<Modal
			supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
			{...modalProps}
		>
			<View style={styles.modalBackground}>{content}</View>
		</Modal>
	);
};

export default ModalElement;
