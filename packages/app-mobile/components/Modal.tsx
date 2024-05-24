import * as React from 'react';
import { useMemo } from 'react';
import { Modal, ModalProps, StyleSheet, View, ViewStyle, useWindowDimensions } from 'react-native';
import { hasNotch } from 'react-native-device-info';

interface ModalElementProps extends ModalProps {
	children: React.ReactNode;
	containerStyle?: ViewStyle;
	elevation?: number;
}

const useStyles = () => {
	const { width: windowWidth, height: windowHeight } = useWindowDimensions();
	const isLandscape = windowWidth > windowHeight;
	return useMemo(() => {
		return StyleSheet.create({
			modalContainer: isLandscape ? {
				paddingRight: hasNotch() ? 60 : 0,
				paddingLeft: hasNotch() ? 60 : 0,
				paddingTop: 15,
				paddingBottom: 15,
			} : {
				paddingTop: hasNotch() ? 65 : 15,
				paddingBottom: hasNotch() ? 35 : 15,
			},
		});
	}, [isLandscape]);
};

const ModalElement: React.FC<ModalElementProps> = ({
	children,
	containerStyle,
	...modalProps
}) => {
	const styles = useStyles();

	// supportedOrientations: On iOS, this allows the dialog to be shown in non-portrait orientations.
	return (
		<Modal
			supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
			{...modalProps}
			style={{ flex: 1, justifyContent: 'center', paddingRight: 100 }}
		>
			<View style={[styles.modalContainer, containerStyle]}>
				{children}
			</View>
		</Modal>
	);
};

export default ModalElement;
